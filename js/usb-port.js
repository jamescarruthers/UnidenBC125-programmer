/**
 * WebUSB transport for the UBC125XLT.
 *
 * macOS creates no serial port for this scanner because its USB descriptors
 * have no CDC functional descriptors, so Web Serial can't see it. This class
 * reaches the same USB endpoints through WebUSB, and provides the parts of the
 * Web Serial SerialPort interface that BC125AT uses: open(), readable,
 * writable and close().
 */
class UsbSerialPort {
  static VENDOR_ID = 0x1965;
  static PRODUCT_ID = 0x0018;
  static CONTROL_INTERFACE = 0;
  static DATA_INTERFACE = 1;
  static ENDPOINT_IN = 1;
  static ENDPOINT_OUT = 2;
  static PACKET_SIZE = 64;

  /**
   * Show the browser's USB device chooser. Call this from a click handler.
   */
  static async request() {
    const device = await navigator.usb.requestDevice({
      filters: [{ vendorId: UsbSerialPort.VENDOR_ID, productId: UsbSerialPort.PRODUCT_ID }]
    });
    return new UsbSerialPort(device);
  }

  constructor(device) {
    this.device = device;
    this.readable = null;
    this.writable = null;
    this.closing = false;
  }

  async open({ baudRate }) {
    await this.device.open();
    if (!this.device.configuration) {
      await this.device.selectConfiguration(1);
    }
    await this.device.claimInterface(UsbSerialPort.CONTROL_INTERFACE);
    await this.device.claimInterface(UsbSerialPort.DATA_INTERFACE);
    await this.setLineCoding(baudRate);
    await this.sendControl(0x22, 0x0003); // SET_CONTROL_LINE_STATE: DTR + RTS

    this.closing = false;
    this.readable = new ReadableStream({
      pull: (controller) => this.pull(controller),
      cancel: () => { this.closing = true; }
    });
    this.writable = new WritableStream({
      write: (chunk) => this.device.transferOut(UsbSerialPort.ENDPOINT_OUT, chunk)
    });
  }

  async setLineCoding(baudRate) {
    const lineCoding = new DataView(new ArrayBuffer(7));
    lineCoding.setUint32(0, baudRate, true);
    lineCoding.setUint8(6, 8); // 8 data bits; 1 stop bit and no parity are 0
    await this.sendControl(0x20, 0, lineCoding.buffer);
  }

  async sendControl(request, value, data) {
    await this.device.controlTransferOut({
      requestType: 'class',
      recipient: 'interface',
      request,
      value,
      index: UsbSerialPort.CONTROL_INTERFACE
    }, data);
  }

  async pull(controller) {
    try {
      while (!this.closing) {
        const result = await this.device.transferIn(
          UsbSerialPort.ENDPOINT_IN,
          UsbSerialPort.PACKET_SIZE
        );
        if (result.status === 'stall') {
          await this.device.clearHalt('in', UsbSerialPort.ENDPOINT_IN);
        }
        if (result.data && result.data.byteLength > 0) {
          controller.enqueue(new Uint8Array(result.data.buffer));
          return;
        }
      }
    } catch (error) {
      // close() cancels the pending transfer, which is expected.
      if (!this.closing) {
        throw error;
      }
    }
  }

  async close() {
    this.closing = true;
    await this.device.close();
    this.readable = null;
    this.writable = null;
  }
}
