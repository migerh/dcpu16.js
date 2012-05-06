/**

  This file is part of dcpu16.js
  
  Copyright 2012 Michael Gerhaeuser
  
  https://github.com/migerh/dcpu16.js
  
  dcpu16.js is free software; You can redistribute it and/or
  modify it under the terms of the MIT license. You should have
  received a copy of the MIT license along with dcpu16.js. If not,
  see http://www.opensource.org/licenses/MIT

 **/

load('src/io-rhino.js');
load('src/common.js');
load('src/cli-common.js');
load('src/asm.js');
load('src/parser.js');

DCPU16.separator = java.lang.System.getProperty('file.separator');

var program = 'rhino cli-rhino.js',
	i, args = Array.prototype.slice.call(arguments, 0),
	options = DCPU16.parseArguments(args),
	src, assembly,
	fo;

if (options.help) {
	print(DCPU16.usage(program));
	quit(0);
}

if (options.version) {
	print('Version: ' + DCPU16.version() + '\n');
	quit(0);
}

if (!options.src) {
	print(DCPU16.usage(program));
	quit(0);
}

options.out = options.out || 'a.rom';
options.fromFile = true;
options.base = 0;

try {
	assembly = DCPU16.asm(options.src, options);
	
	if (options.include) {
		print(assembly);
		quit(0);
	}
	
	print('dcpu16.js asm ' + DCPU16.version() + '\n');

	if (options.warn) {
		for (i = 0; i < assembly.warnings.length; i++) {
			print('Warning in ' + assembly.warnings[i].file + ':' + assembly.warnings[i].line + ': ' + assembly.warnings[i].message);
		}
	}

	DCPU16.IO.saveBinary(options.out, assembly.bc);
} catch (e) {
	if (e.name === 'ParserError') {
		print('Error in ' + e.file + ':' + e.line + ': ' + e.message);
	} else {
		print(e);
	}
}
