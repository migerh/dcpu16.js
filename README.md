dcpu16.js
=========

This is yet another assembler and emulator package for the DCPU16 processor as
defined by notch/mojang (see http://0x10c.com/doc/dcpu-16.txt).

I always wanted to write an emulator for some processor and the DCPU16 seemed
fairly easy to implement.

Usage
=====

	var result = DCPU16.asm(src);
Assembles the source code into a memory image (an array of bytes) which is accessible through the
*bc* attribute. There's also some meta information returned in the *meta* property containing the
address to line conversion object *addr2line*, the line to address conversion object *line2addr*
and the entry point in *entry*.

	var bc = result.bc;
	var line = result.meta.addr2line[0x1F];
	var addr = result.meta.line2addr[2];
	var entryline = result.meta.entry;  // equals result.meta.addr2line[0]

Please note that lines without a corresponding address (and vice versa) are undefined.

	var PC = new DCPU16.PC();
Initializes a new DCPU16 PC.
Optional parameter: An array of bytes.

	PC.load(rom);
Load the rom given as a memory image (an array of bytes).

	PC.step();
Executes one step.

	PC.clear();
Clear all registers and flags and reinitialize the RAM.

	PC.ram[]
Access the ram. The registers and flags (A, B, C, X, Y, Z, I, J, SP, PC, O) can
be accessed as properties of the ram:

	var valueOfRegisterA = PC.ram.A;

To render the content of the screen buffer use
	PC.renderScreen(canvas);
where *canvas* is a canvas context.

Acknowledgements
================

dcpu16.js uses test cases from [krasin](https://github.com/krasin/dcpu16-tests).
Base64 encoding has been borrowed from [Stuk's jszip](https://github.com/Stuk/jszip).

Other projects/libraries used:
* [jQuery](http://www.jquery.com)
* [Ace](http://ace.ajax.org/)
* [PEG.js](https://github.com/dmajda/pegjs)
