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

	var _ = {
		// private stuff
	};

	DCPU16.Clock = function (dcpu) {
		var that = this;
		
		this.description = 'clock';
		this.id = 0x12d0b402;
		this.version = 0x1;
		this.manufacturer = 0xCAFEBABE;
		
		// more properties
		this.message = 0;
		this.timeout = 0;
		this.ticks = 0;
		
		this.timer = 0;
		
		this.int = function () {
			var b = this.dcpu.ram.B;
			
			switch (this.dcpu.ram.A) {
			case 0:
				// The B register is read, and the clock will tick 60/B times per second. If B is 0, the clock is turned off.
				this.ticks = 0;
				
				if (b === 0) {
					this.disable();
				} else {
					this.timeout = 100/6 * b;
					this.enable();
				}
				break;
			case 1:
				// Store number of ticks elapsed since last call to 0 in C register
				this.dcpu.ram.C = this.ticks;
				break;
			case 2:
				// If register B is non-zero, turn on interrupts with message B. If B is zero, disable interrupts
				this.message = b;
				break;
			}
		};
		
		// more methods
		this.handleTimer = function () {
			this.ticks++;
			
			if (this.message > 0) {
				this.dcpu.int(this.message);
			}
			
			this.enable();
		};
		
		this.enable = function () {
			this.timer = setTimeout(function () {
				that.handleTimer.apply(that, arguments);
			}, this.timeout);
		};
		
		this.disable = function () {
			clearTimeout(this.timer);
		};

		this.dcpu = dcpu;
		this.dcpu.add(this);
	};

})();
