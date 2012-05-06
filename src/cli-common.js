/**

  This file is part of dcpu16.js
  
  Copyright 2012 Michael Gerhaeuser
  
  https://github.com/migerh/dcpu16.js
  
  dcpu16.js is free software; You can redistribute it and/or
  modify it under the terms of the MIT license. You should have
  received a copy of the MIT license along with dcpu16.js. If not,
  see http://www.opensource.org/licenses/MIT

 **/

var DCPU16 = DCPU16 || {};

(function () {
	DCPU16.usage = function (program) {
		var str = [
				'Usage:',
				'  ' + program + ' [OPTIONS] INFILE',
				'',
				'    INFILE        The source file.',
				'',
				'  Options:',
				'    -h, --help',
				'        Prints this information and exits.',
				'    -i, --include',
				'        Resolve includes and output the result to stdout.',
				'    -o, --output FILE',
				'        Output the assembly into the given file. Defaults to a.rom.',
				'    -w, --warnings',
				'        Prints warnings.',
				'    --version',
				'        Prints the version and exits.'
			];
		return str.join('\n');
	};
	
	DCPU16.parseArguments = function (argv) {
		var i, j,
			options = {};
		
		for (i = 0; i < argv.length; i++) {
			if (argv[i].toLowerCase() == "-o" || argv[i].toLowerCase() == "--output") {
				options.out = argv[++i];
			} else if (argv[i].toLowerCase() == "-w" || argv[i].toLowerCase() == "--warnings") {
				options.warn = true;
			} else if (argv[i].toLowerCase() == "-v" || argv[i].toLowerCase() == "--verbose") {
				options.verbose = true;
			} else if (argv[i].toLowerCase() == "-i" || argv[i].toLowerCase() == "--include") {
				options.include = true;
			} else if (argv[i].toLowerCase() == "--version") {
				options.version = true;
			} else if (argv[i].toLowerCase() == "-h" || argv[i].toLowerCase() == "--help") {
				options.help = true;
			} else if (!options.src) {
				options.src = argv[i];
			}
		}
		
		return options;
	};
})();
