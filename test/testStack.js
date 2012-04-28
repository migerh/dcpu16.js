/*
 *  Js-Test-Driver Test Suite for Generic JavaScript language tests
 *  http://code.google.com/p/js-test-driver
 */

TestCase("Stack", {
	cpu: null,
	
	setUp: function () {
		this.cpu = new DCPU16.PC();
	},

	tearDown: function () {
	},
	
	testStackInit: function () {
		expectAsserts(1);

		var src =
			'SUB PC, 1';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(4);
		
		assertEquals('stack initialized with 0', 0x0, this.cpu.ram.SP);
	},
	
	testPush: function () {
		expectAsserts(2);

		var src =
			'SET PUSH, 0xDEAD\n' +
			'SET [--SP], 0xBEEF\n' +

			'SUB PC, 1';
			
		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(5);
		
		assertEquals('push', 0xDEAD, this.cpu.getWord(this.cpu.ram.SP + 1));
		assertEquals('[--SP]', 0xBEEF, this.cpu.getWord(this.cpu.ram.SP));
	},

	testPop: function () {
		expectAsserts(2);

		var src =
			'SET PUSH, 0xDEAD\n' +
			'SET [--SP], 0xBEEF\n' +
			'SET A, POP\n' +
			'SET B, [SP++]\n' +
   		
			'SUB PC, 1';

		assertException('pop', 0xBEEF, this.cpu.ram.A);
		assertException('[SP++]', 0xDEAD, this.cpu.ram.B);
	},

	testPopLeft: function () {
		expectAsserts(1);

		var src =
			'SET POP, 0xDEAD\n' +
   		
			'SUB PC, 1';

 		assertException('pop left', function () { this.cpu.load(DCPU16.asm(src).bc); }, DCPU16.ParserError());
	},

	testPushRight: function () {
		expectAsserts(1);

		var src =
			'SET A, PUSH\n' +
   		
			'SUB PC, 1';

 		assertException('push right', function () { this.cpu.load(DCPU16.asm(src).bc); }, DCPU16.ParserError());
	},
	
	testPick: function () {
		expectAsserts(3);

		var src =
			'SET PUSH, 0xDEAD\n' +
			'SET PUSH, 0xCAFE\n' +
			'SET PUSH, 0xBABE\n' +

			'SET A, [SP+2]\n' +
			'SET B, [SP]\n' +
			'SET C, [SP+1]\n' +
   		
			'SUB PC, 1';

		assertException('[SP+2]', 0xDEAD, this.cpu.ram.A);
		assertException('[SP]', 0xBABE, this.cpu.ram.B);
		assertException('[SP+1]', 0xCAFE, this.cpu.ram.C);
	}
	
	
});
