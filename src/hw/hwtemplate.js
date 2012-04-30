/**

  This file is part of dcpu16.js
  
  Copyright 2012 Michael Gerhaeuser
  
  https://github.com/migerh/dcpu16.js
  
  dcpu16.js is free software; You can redistribute it and/or
  modify it under the terms of the MIT license. You should have
  received a copy of the MIT license along with dcpu16.js. If not,
  see http://www.opensource.org/licenses/MIT

 **/
 
 

/*
 *
 * Template for hardware.
 *
 */

var DCPU16 = DCPU16 || {};

(function () {

	var _ = {
		// private stuff
	};

	DCPU16.NE_LEM1802 = function (dcpu) {
		this.description = 'keyboard';
		this.id = 0xDEADBEEF;
		this.version = 0x1234;
		this.manufacturer = 0xCAFEBABE;
		
		// more properties
		
		this.int = function () {
			var b = this.dcpu.ram.B;
			
			switch (this.dcpu.ram.A) {
			case 0:
				// TODO
				break;
			case 1:
				// TODO
				break;
			case 2:
				// TODO
				break;
			case 3:
				// TODO
				break;
			}
		};
		
		// more methods

		this.dcpu = dcpu;
		this.dcpu.add(this);
	};

})();
