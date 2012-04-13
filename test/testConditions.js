/*
 *  Js-Test-Driver Test Suite for Generic JavaScript language tests
 *  http://code.google.com/p/js-test-driver
 */

TestCase("Conditions", {
	cpu: null,
	
	setUp: function () {
		this.cpu = new DCPU16.PC();
	},

	tearDown: function () {
	},
	
	testIfe: function () {
		expectAsserts(2);

		var src =
			'SET X, 0x1000\n' +
			'IFE X, 0x1001\n' +
			'SET X, 0xDEAD\n' +

			'SET Y, 0x1000\n' +
			'IFE Y, 0x1000\n' +
			'SET Y, 0xBEEF\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('unequal', 0x1000, this.cpu.ram.X);
		assertEquals('equal', 0xBEEF, this.cpu.ram.Y);
	},

	testIfn: function () {
		expectAsserts(2);

		var src =
			'SET X, 0x1000\n' +
			'IFN X, 0x1001\n' +
			'SET X, 0xDEAD\n' +

			'SET Y, 0x1000\n' +
			'IFN Y, 0x1000\n' +
			'SET Y, 0xBEEF\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('unequal', 0xDEAD, this.cpu.ram.X);
		assertEquals('equal', 0x1000, this.cpu.ram.Y);
	},

	testIfg: function () {
		expectAsserts(3);

		var src =
			'SET X, 0x1000\n' +
			'IFG X, 0x1001\n' +
			'SET X, 0xDEAD\n' +

			'SET Y, 0x1000\n' +
			'IFG Y, 0x1000\n' +
			'SET Y, 0xCAFE\n' +
			
			'SET Z, 0x1000\n' +
			'IFG Z, 0x0100\n' +
			'SET Z, 0xBABE\n' +
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('smaller', 0x1000, this.cpu.ram.X);
		assertEquals('equal', 0x1000, this.cpu.ram.Y);
		assertEquals('greater', 0xBABE, this.cpu.ram.Z);
	},

	testIfb: function () {
		expectAsserts(2);

		var src =
			'SET X, 0x1000\n' +
			'IFB X, 0x0001\n' +
			'SET X, 0xDEAD\n' +

			'SET Y, 0x1000\n' +
			'IFB Y, 0x1001\n' +
			'SET Y, 0xBEEF\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('no bits', 0x1000, this.cpu.ram.X);
		assertEquals('one bit', 0xBEEF, this.cpu.ram.Y);
	}

});
