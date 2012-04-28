
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
