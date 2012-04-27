/*
 *  Js-Test-Driver Test Suite for Generic JavaScript language tests
 *  http://code.google.com/p/js-test-driver
 */

TestCase("Set", {
	cpu: null,
	
	setUp: function () {
		this.cpu = new DCPU16.PC();
	},

	tearDown: function () {
	},
	
	testSet: function () {
		expectAsserts(5);

		var src =
			'SET X, 0x1000\n' +
			'SET 0x3000, 5\n' +
			'SET [0x1000], 3\n' +
			'SET [0x1000+X], 4\n' +
			'SET A, 0x4000\n' +
			'SET [A], 5\n' +
			
			'SUB PC, 1';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('set register to value', 0x1000, this.cpu.ram.X);
		assertEquals('set value to value', 0, this.cpu.getWord(0x3000));
		assertEquals('set mem to value', 3, this.cpu.ram[0x1000]);
		assertEquals('set mem+reg to value', 4, this.cpu.ram[0x2000]);
		assertEquals('set [reg] to value', 5, this.cpu.ram[0x4000]);
	},
	
	testGet: function () {
		expectAsserts(5);

		// if the source is changed, adjust the expected value marked below
		var src =
			'SET X, 0x1000\n' +
			'SET 0x3000, 5\n' +
			'SET [0x1000], 3\n' +
			'SET [0x1000+X], 4\n' +
			'SET A, 0x4000\n' +
			'SET [A], 5\n' +
			
			'SET B, [X]\n' +
			'SET C, [0x1000+X]\n' +
			'SET I, data\n' +
			'SET J, [data]\n' +
			'SET A, 1\n' +
			'SET Y, [data+A]\n' +
			
			':halt SET PC, halt\n' + 
			':data dat 0, 0xDEAD';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('read from [reg]', 3, this.cpu.ram.B);
		assertEquals('read from [addr+reg]', 4, this.cpu.ram.C);
		/* -> */assertEquals('read from label', 23, this.cpu.ram.I);
		assertEquals('read from [label]', 0, this.cpu.ram.J);
		assertEquals('read from [label+reg]', 0xDEAD, this.cpu.ram.Y);
	},

	testExpressionValue: function () {
		expectAsserts(1);

		// if the source is changed, adjust the expected value marked below
		var src =
			'SET X, 0x1000+X\n' +
   		
			':halt SET PC, halt';

		assertException('expression values are not allowed', function () { this.cpu.load(DCPU16.asm(src).bc); }, DCPU16.ParserError());
	}
	
});
