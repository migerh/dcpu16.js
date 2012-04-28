
var DCPU16 = DCPU16 || {};

(function () {
	var _ = {
		registers: {A: 0x0, B: 0x1, C: 0x2, X: 0x3, Y: 0x4, Z: 0x5, I: 0x6, J: 0x7},
		registers_rev: ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'],
		values_rev: [],
	},
	ExecutionError = function (msg) {
		this.name = 'ExecutionError';
		this.message = msg;
	};
	ExecutionError.prototype = Error.prototype;


	_.values_rev[0x1b] = 'SP';
	_.values_rev[0x1c] = 'PC';
	_.values_rev[0x1d] = 'EX';
	_.values_rev[0x18] = 'POP';
	_.values_rev[0x19] = 'PEEK';
	_.values_rev[0x1a] = 'PICK';

	DCPU16.PC = function (rom) {
		this.ramSize = DCPU16.ramSize;
		this.maxWord = DCPU16.maxWord;
		this.skipNext = false;
		this.isRunning = false;
		this.stepCount = 0;
		
		this.interrupts = [];
		this.queue = false;
		
		this.devices = [];
			
		this.events = {};
		this.breakpoints = {};
			
		this.on = function (event, handler, scope) {
			this.events[event] = this.events[event] || [];
			handler.scope = DCPU16.def(scope, this);
			this.events[event].push(handler);
		};
			
		this.off = function (event, handler) {
			var i;
				
			if (this.events[event]) {
				for (i = 0; i < this.events[event].length; i++) {
					if (this.events[event][i] === handler) {
						this.events[event].splice(i, 1);
						break;
					}
				}
			}
		};
			
		this.trigger = function (event) {
			var i, args = Array.prototype.slice(args, 1);
				
			if (this.events[event]) {
				for (i = 0; i < this.events[event].length; i++) {
					this.events[event][i].call(this.events[event][i].scope, args);
				}
			}
		};
			
		this.toggleBreakpoint = function (addr) {
			return this.breakpoints[addr] = !this.breakpoints[addr];
		};
						
		this.clear = function () {
			var i;
				
			this.ram = new Array(this.ramSize);
				
			// use the registers as properties of the RAM
			// this simplifies getWord and setWord
			this.ram.PC = 0;
			this.ram.SP = 0;
			this.ram.EX = 0;
			this.ram.IA = 0;
				
			for (i in _.registers) {
				if (_.registers.hasOwnProperty(i)) {
					this.ram[i] = 0;
				}
			}
				
			this.stepCount = 0;
		};
			
		this.load = function (rom, where) {
			var i = 0;
				
			where = DCPU16.def(where, 0);
				
			while (i < rom.length) {
				this.ram[where + i] = ((rom[2 * i + 1] & 0xff) << 8) | ((rom[2 * i] || 0) & 0xff);
				i++;
			}
		};
			
		this.setWord = function (ptr, val) {
			this.ram[ptr] = val & this.maxWord;
		};
			
		this.getWord = function (ptr) {
			return this.ram[ptr] || 0;
		};
			
		this.getValue = function (val, which) {
			var r;
				
			if (val < 0x1f) {
				r = this.getWord(this.getAddress(val));
			} else if (val == 0x1f) {
				r = this.getWord(this.ram.PC++);
			} else if (val >= 0x20 && val < 0x40) {
				r = val - 0x21;
			}
			
			return r;
		};
		
		this.getAddress = function (val, which) {
			var r;
			
			if (val >= 0 && val < 0x8) {
				r = _.registers_rev[val];
			} else if (val >= 0x8 && val < 0x10) {
				r = this.getWord(_.registers_rev[val - 8]);
			} else if (val >= 0x10 && val < 0x18) {
				r = (this.getWord(this.ram.PC++) + this.getWord(_.registers_rev[val - 0x10])) & this.maxWord;
			} else if (val == 0x18) {
				if (which === 1) {
					// push
					if (!this.skipNext) {
						this.setWord('SP', this.ram.SP - 1);
					}
					r = this.ram.SP;
				} else {
					r = this.ram.SP;
					if (!this.skipNext) {
						this.setWord('SP', this.ram.SP + 1);
					}
				}
			} else if (val == 0x19) {
				r = this.ram.SP;
			} else if (val == 0x1a) {
				// PICK n
				r = this.getWord(this.ram.PC++);
				r = this.ram.SP + r;
			} else if (val >= 0x1b && val <= 0x1d) {
				r = _.values_rev[val];
			} else if (val == 0x1e) {
				r = this.getWord(this.ram.PC++);
			} else if (val == 0x1f) {
				this.ram.PC++;
			}
			
			return r;
		};
		
		this.triggerInterrupt = function (message) {
			if (this.ram.IA !== 0) {
				this.interrupts.push(message);
			}
		};
		
		this.add = function (device) {
			if (device && device.id && device.version && device.manufacturer) {
				this.devices.push(device);
			}
		};
			
		this.exec = function (op, a, b) {
			var tmp, addrA, valB, valA;
			
			// because of historical reason in here valA/addrA is in the
			// current 1.7 spec is called 'b' and valB is called 'a' in the spec.

			if (op > 0) {
				valB = this.getValue(a, 0);
			}
			
			if (op >= 0x10 && op <= 0x17) {
				// special treatment for conditions
				addrA = this.getValue(b, 1);
			} else if (op > 0) {
				addrA = this.getAddress(b, 1);
			}

			// fail silently
			// BUT NOT FOR CONDITIONS, STUPID!!!
			if ((((op > 0 && op < 0x10) || op > 0x17) && !addrA) || this.skipNext) {
				this.skipNext = false;
				return;
			}

			switch (op) {
			case 0:
				switch (b) {
				case 0x1:
					valB = this.getValue(a, 0);
					this.setWord('SP', this.ram.SP - 1);

					this.ram[this.ram.SP] = this.ram.PC;
					this.ram.PC = valB;
					break;
				case 0x8: // INT
					// triggers a software interrupt with message a
					valB = this.getValue(a, 0);
					this.triggerInterrupt(valB);
					break;
				case 0x9: // IAG
					// sets A to IA
					valB = this.getAddress(a, 0);
					this.setWord(valB, this.ram.IA);
					break;
				case 0xa: // IAS
					// sets IA to a
					valB = this.getValue(a, 0);
					this.setWord('IA', valB);
					break;
				case 0xb: // RFI
					// disables interrupt queueing, pops A from the stack, then pops PC from the stack
					
					// unused, but the spec wants it
					valB = this.getValue(a, 0);
					
					this.ram.A = this.ram[this.ram.SP];
					this.ram.PC = this.ram[this.ram.SP + 1];
					this.setWord('SP', this.ram.SP + 2);
					this.queue = false;
					break;
				case 0xc: // IAQ
					// if a is nonzero, interrupts will be added to the queue instead of triggered. if a is zero, interrupts will be triggered as normal again
					valB = this.getValue(a, 0);
					if (valB > 0) {
						this.queue = true;
					} else {
						this.queue = false;
					}
					break;
				case 0x10: // HWN
					valB = this.getAddress(a, 0);
					// sets a to number of connected hardware devices
					this.setWord(valB, this.devices.length);
					break;
				case 0x11: // HWQ
					// sets A, B, C, X, Y registers to information about hardware a A+(B<<16) is a 32 bit word identifying the
					// hardware id C is the hardware version X+(Y<<16) is a 32 bit word identifying the manufacturer
					valB = this.getValue(a, 0);
					
					this.setWord('A', this.devices[valB].id);
					this.setWord('B', this.devices[valB].id >>> 16);
					
					this.setWord('C', this.devices[valB].version);

					this.setWord('X', this.devices[valB].manufacturer);
					this.setWord('Y', this.devices[valB].manufacturer >>> 16);
					break;
				case 0x12: // HWI
					// sends an interrupt to hardware a
					valB = this.getValue(a, 0);
					this.devices[valB].int();
					break;
				default:
					throw new ExecutionError('Unknown opcode "' + op.toString(16) + '".');
					break;
				}
				break;
			case 0x1: // SET
				this.setWord(addrA, valB);
				break;
			case 0x2: // ADD
				tmp = this.getWord(addrA) + valB;
					
				this.ram.EX = 0;
				if (tmp & this.maxWord + 1) {
					this.ram.EX = 1;
				}
					
				this.setWord(addrA, tmp);
				break;
			case 0x3: // SUB
				tmp = this.getWord(addrA) - valB;
				
				this.ram.EX = 0;
				if (tmp < 0) {
					this.ram.EX = this.maxWord;
					tmp = this.maxWord + tmp + 1;
				}
				
				this.setWord(addrA, tmp);
				break;
			case 0x4: // MUL
				tmp = this.getWord(addrA) * valB;

				this.setWord('EX', tmp >> 16);				
				this.setWord(addrA, tmp);
				break;
			case 0x5: // MLI
				tmp = DCPU16.signed(this.getWord(addrA)) * DCPU16.signed(valB);
				
				this.setWord('EX', tmp >> 16);
				this.setWord(addrA, tmp);
				break;
			case 0x6: // DIV
				if (valB === 0) {
					tmp = 0;
					this.ram.EX = 0;
				} else {
					tmp = Math.floor(this.getWord(addrA) / valB);
					this.ram.EX = (Math.floor(this.getWord(addrA) << 16) / valB) & this.maxWord;
				}
				
				this.setWord(addrA, tmp);
				break;
			case 0x7: // DVI
				valB = DCPU16.signed(valB);
				valA = DCPU16.signed(this.getWord(addrA));
				if (valB === 0) {
					tmp = 0;
					this.ram.EX = 0;
				} else {
					tmp = Math.floor(valA / valB);
					this.setWord('EX', Math.floor(valA << 16) / valB);
				}
				
				this.setWord(addrA, tmp);
				break;
			case 0x8: // MOD
				if (valB === 0) {
					tmp = 0;
				} else {
					tmp = this.getWord(addrA) % valB;
				}
				
				this.setWord(addrA, tmp);
				break;
			case 0x9: // MDI
				valB = DCPU16.signed(valB);
				valA = DCPU16.signed(this.getWord(addrA));
				
				if (valB === 0) {
					tmp = 0;
				} else {
					tmp = valA % valB;
				}
				
				this.setWord(addrA, tmp);
				break;
			case 0xa: // AND
				tmp = this.getWord(addrA) & valB;
					
				this.setWord(addrA, tmp);
				break;
			case 0xb: // BOR
				tmp = this.getWord(addrA) | valB;
				
				this.setWord(addrA, tmp);
				break;
			case 0xc: // XOR
				tmp = this.getWord(addrA) ^ valB;
				
				this.setWord(addrA, tmp);
				break;
			case 0xd: // SHR
				tmp = this.getWord(addrA) >>> valB;
				this.ram.EX = ((this.getWord(addrA) << 16) >> valB) & this.maxWord;
				
				this.setWord(addrA, tmp);
				break;
			case 0xe: // ASR
				// sets b to b>>a, sets EX to ((b<<16)>>>a)&0xffff  (arithmetic shift) (treats b as signed)
				valA = DCPU16.signed(this.getWord(addrA));
				tmp = valA >> valB;
				
				this.setWord('EX', ((valA << 16) >>> valB));
				this.setWord(addrA, tmp);
				break;
			case 0xf: // SHL
				tmp = this.getWord(addrA) << valB;
				this.ram.EX = (tmp >> 16) & this.maxWord;
				
				this.setWord(addrA, tmp);
				break;
			case 0x10: // IFB
				if ((addrA & valB) === 0) {
					this.skipNext = true;
					this.step();
				}
				break;
			case 0x11: // IFC
				if ((addrA & valB) !== 0) {
					this.skipNext = true;
					this.step();
				}
				break;
			case 0x12: // IFE
				// performs next instruction only if b==a
				if (addrA !== valB) {
					this.skipNext = true;
					this.step();
				}
				break;
			case 0x13: // IFN
				// performs next instruction only if b!=a
				if (addrA === valB) {
					this.skipNext = true;
					this.step();
				}
				break;
			case 0x14: // IFG
				// performs next instruction only if b>a
				if (addrA <= valB) {
					this.skipNext = true;
					this.step();
				}
				break;
			case 0x15: // IFA
				// performs next instruction only if b>a (signed)
				if (DCPU16.signed(addrA) <= DCPU16.signed(valB)) {
					this.skipNext = true;
					this.step();
				}
				break;
			case 0x16: // IFL
				// performs next instruction only if b<a 
				if (addrA >= valB) {
					this.skipNext = true;
					this.step();
				}
				break;
			case 0x17: // IFU
				// performs next instruction only if b<a (signed)
				if (DCPU16.signed(addrA) >= DCPU16.signed(valB)) {
					this.skipNext = true;
					this.step();
				}
				break;
			case 0x1a: // ADX
				// sets b to b+a+EX, sets EX to 0x1 if there is an overflow, 0x0 otherwise
				tmp = this.getWord(addrA) + valB + this.ram.EX;
					
				this.ram.EX = 0;
				if (tmp & this.maxWord + 1) {
					this.ram.EX = 1;
				}
					
				this.setWord(addrA, tmp);
				break;
			case 0x1b: // SBX
				// sets b to b-a+EX, sets EX to 0xFFFF if there is an underflow, 0x0 otherwise
				tmp = this.getWord(addrA) - valB + this.ram.EX;

				this.ram.EX = 0;
				if (tmp < 0) {
					this.ram.EX = this.maxWord;
					tmp = this.maxWord + tmp;
				}
				
				this.setWord(addrA, tmp);
				break;
			case 0x1e: // STI
				// sets b to a, then increases I and J by 1
				this.setWord('I', this.ram.I + 1);
				this.setWord('J', this.ram.J + 1);
				
				this.setWord(addrA, valB);
				break;
			case 0x1f: // STD
				// sets b to a, then decreases I and J by 1
				this.setWord('I', this.ram.I - 1);
				this.setWord('J', this.ram.J - 1);
				
				this.setWord(addrA, valB);
				break;
			default:
				throw new ExecutionError('Unknown opcode "' + op.toString(16) + '".');
				break;
			}
		};
		
		this.step = function (trigger) {
			var w, op, b, a;
			
			// check for interrupts
			if (this.ram.IA === 0 && this.interrupts.length > 0) {
				this.interrupts.length = 0;
			} else if (this.ram.IA > 0 && this.interrupts.length > 0) {
				this.queue = true;
				this.setWord('SP', this.ram.SP - 2);
				this.setWord(this.ram.SP + 1, this.ram.PC);
				this.setWord(this.ram.SP, this.ram.A);
				
				this.ram.A = this.interrupts.shift();
				this.ram.PC = this.ram.IA;
			}
			
			w = this.getWord(this.ram.PC++);
			op = w & 0x1f;
			b = (w & 0x3e0) >> 5;
			a = (w & 0xfc00) >> 10;

			trigger = DCPU16.def(trigger, true);

			this.exec(op, a, b);
			this.stepCount++;
				
			if (trigger) {
				this.trigger('update');
			}

			// step should be executed even if a breakpoint is set
			if (this.breakpoints[this.ram.PC]) {
				return false;
			} else {
				return true;
			}
		};
			
		this.steps = function (steps) {
			var i, r = true;
				
			for (i = 0; i < steps; i++) {
				if (!this.step(false)) {
					r = false;
					break;
				}
			}
			this.trigger('update');
				
			return r;
		};
			
		this.start = function () {
			var _this = this,
				timer = 10,
				runner = function () {
					if (_this.isRunning && _this.steps(3000)) {
						setTimeout(runner, timer);
					} else {
						_this.stop();
					}
				};

			this.isRunning = true;
			this.step(false);
			setTimeout(runner, timer);
		};
			
		this.stop = function () {
			this.isRunning = false;
			this.trigger('update', true);
		};
			
		this.clear();

		if (rom) {
			this.load(rom);
		}
	}
})();


