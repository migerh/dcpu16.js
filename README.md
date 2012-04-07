dcpu16.js
=========

This is yet another assembler and emulator package for the DCPU16 processor as
defined by notch/mojang (see http://0x10c.com/doc/dcpu-16.txt).

I always wanted to write an emulator for some processor and the DCPU16 seemed
fairly easy to implement.

Usage
=====

var bytecode = DCPU16.asm(src);
Assembles the source code into a memory image (an array of bytes).

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
