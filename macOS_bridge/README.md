# ubc125

A small command-line tool for talking to a Uniden UBC125XLT scanner over USB on macOS.

## Why this exists

When you connect a UBC125XLT to a Mac, macOS detects it but no `/dev/cu.*` serial port appears, so serial software can't reach it.

The scanner's USB descriptors have no CDC functional descriptors, and Apple's serial driver doesn't attach without them. `ubc125` skips that driver and talks to the scanner's USB data endpoints directly through libusb. No driver install is needed.

## Requirements

- macOS
- Python 3
- A UBC125XLT connected by USB, switched on, with USB ID `1965:0018`

Tested on macOS 26.3 on Apple silicon, with scanner firmware 1.02.06.

## Install

```sh
git clone <repository-url> ubc125
cd ubc125
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

libusb is included with the `libusb-package` dependency, so you don't need to install it separately.

Activate the virtual environment in each new terminal before you use the tool:

```sh
source .venv/bin/activate
```

## Usage

### Send commands

Pass one or more commands as arguments. The tool prints each reply on its own line.

```console
$ ./ubc125 MDL VER
MDL,UBC125XLT
VER,Version 1.02.06
```

### Interactive prompt

Run the tool with no arguments, then type commands at the prompt. Press Ctrl-D or Ctrl-C to quit.

```console
$ ./ubc125
ubc125> VOL
VOL,0
```

### Virtual serial port

Use bridge mode to connect other serial software to the scanner:

```console
$ ./ubc125 --bridge
Serial port ready: /path/to/ubc125/port -> /dev/ttys007
```

The port is a link named `port`, next to the script. It works until you press Ctrl-C.

- Enter the path to `port` by hand. It isn't in `/dev/cu.*`, so it won't appear in an app's port list.
- Use the `port` path, not the `/dev/ttys…` address. That address can change each time you start the bridge.
- Commands must end with a carriage return (`\r`).

## Commands

These read-only commands have been tested:

| Command | Returns | Example reply |
|---------|---------|---------------|
| `MDL` | Model name | `MDL,UBC125XLT` |
| `VER` | Firmware version | `VER,Version 1.02.06` |
| `VOL` | Volume level | `VOL,0` |
| `SQL` | Squelch level | `SQL,2` |

The tool sends whatever you type to the scanner unchanged, including commands that change its settings or stored data. Check a command in Uniden's protocol documentation before you send it.

## Troubleshooting

| Message | What to do |
|---------|------------|
| `UBC125XLT not found` | Check the USB cable and make sure the scanner is on. |
| `Can't claim the scanner` | Stop any other running `ubc125`, such as a bridge. Only one can use the scanner at a time. |
| `(no reply)` | The scanner didn't answer within 1.5 seconds. Check the command and try again. |

## Limitations

- It has only been tested on macOS.
- The bridge has been tested with a Python script, not with third-party scanner software.
- It only looks for USB ID `1965:0018`. Other Uniden models may use a different ID.
