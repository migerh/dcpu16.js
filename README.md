dcpu16.js
=========

This is yet another assembler and emulator package for the DCPU16 processor as
defined by notch/mojang, version 1.7 (see http://pastebin.com/raw.php?i=Q4JvQvnM). Try
the [live demo](http://migerh.github.com/dcpu16.js/).

Usage
=====

	var result = DCPU16.asm(src);
Assembles the source code into a memory image (an array of bytes) which is accessible through the
*bc* attribute. There's also some meta information returned in the *meta* property containing the
address to line conversion object *addr2line*, the line to address conversion object *line2addr*
and the entry point in *entry*.

	var bc = result.bc;
	var line = result.addr2line[0x1F];
	var addr = result.line2addr[2];
	var entryline = result.entry;  // equals result.meta.addr2line[0]

Please note that lines without a corresponding address (and vice versa) are undefined.

	var PC = new DCPU16.PC([rom]);
Initializes a new DCPU16 PC.
Optional parameter *rom*: An array of bytes.

	var screen = new DCPU16.NE_LEM1802(PC);
Initialize a screen and connect it to the PC.

	PC.load(rom);
Load the rom given as a memory image (an array of bytes).

	PC.step();
	PC.steps(i);
Executes one or *i* steps.

	PC.start();
	PC.stop();
Run the emulator until *stop* is called.

	PC.clear();
Clear all registers and flags and reinitialize the RAM.

	PC.ram[]
Access the ram. The registers and flags (A, B, C, X, Y, Z, I, J, SP, PC, EX, IA) can
be accessed as properties of the ram:

	var valueOfRegisterA = PC.ram.A;

Contributors
============

* [Dav1dde](https://github.com/Dav1dde)
* FireFly

Acknowledgements
================

dcpu16.js uses test cases from [krasin](https://github.com/krasin/dcpu16-tests).
Base64 encoding has been borrowed from [Stuk's jszip](https://github.com/Stuk/jszip).

Other projects/libraries used:
* [jQuery](http://www.jquery.com)
* [Ace](http://ace.ajax.org/)
* [PEG.js](https://github.com/dmajda/pegjs)
