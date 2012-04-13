/*
 *  Js-Test-Driver Test Suite for Generic JavaScript language tests
 *  http://code.google.com/p/js-test-driver
 */

TestCase("Arithmetics", {
	cpu: null,
	
	setUp: function () {
		this.cpu = new DCPU16.PC();
	},

	tearDown: function () {
	},
	
	testAdd: function () {
		expectAsserts(4);

		// if the source is changed, adjust the expected value marked below
		var src =
			'SET A, 3\n' +
			'SET C, 4\n' +
			'ADD A, C\n' +
			'ADD C, 5\n' +
			'SET B, C\n' +
			'ADD B, 0xffff\n' +
			'SET Z, O\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('add registers', 7, this.cpu.ram.A);
		assertEquals('add value', 9, this.cpu.ram.C);
		assertEquals('overflow', 8, this.cpu.ram.B);
		assertEquals('overflow flag', 1, this.cpu.ram.Z);
	},

	testSub: function () {
		expectAsserts(4);

		// if the source is changed, adjust the expected value marked below
		var src =
			'SET A, 23\n' +
			'SET C, 10\n' +
			'SUB A, C\n' +
			'SUB C, 5\n' +
			'SET B, C\n' +
			'SUB B, 20\n' +
			'SET Z, O\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('sub registers', 13, this.cpu.ram.A);
		assertEquals('sub value', 5, this.cpu.ram.C);
		assertEquals('overflow', 0xfff0, this.cpu.ram.B);
		assertEquals('overflow flag', 0xffff, this.cpu.ram.Z);
	},
	
	testMul: function () {
		expectAsserts(4);

		// if the source is changed, adjust the expected value marked below
		var src =
			'SET A, 23\n' +
			'SET C, 100\n' +
			'MUL A, C\n' +
			'MUL C, 42\n' +
			'SET B, C\n' +
			'MUL B, 1337\n' +
			'SET Z, O\n' +
			
			':halt SET PC, halt';
			
		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('mul registers', 2300, this.cpu.ram.A);
		assertEquals('mul value', 4200, this.cpu.ram.C);
		assertEquals('overflow', 0xaf28, this.cpu.ram.B);
		assertEquals('overflow flag', 0x55, this.cpu.ram.Z);
	},

	testDiv: function () {
		expectAsserts(5);

		// if the source is changed, adjust the expected value marked below
		var src =
			'SET A, 34\n' +
			'SET C, 10\n' +
			'DIV A, C\n' +
			'SET C, 0x1234\n' +
			'DIV C, 0x123\n' +
			'SET Z, O\n' +
			'SET B, C\n' +
			'DIV B, 0\n' +
			'SET Y, O\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('div registers', 3, this.cpu.ram.A);
		assertEquals('div value', 16, this.cpu.ram.C);
		assertEquals('overflow flag', 0x384, this.cpu.ram.Z);
		assertEquals('divbyzero', 0, this.cpu.ram.B);
		assertEquals('divbyzero flag', 0, this.cpu.ram.Y);
	},
	
	testMod: function () {
		expectAsserts(3);

		// if the source is changed, adjust the expected value marked below
		var src =
			'SET A, 23\n' +
			'SET C, 10\n' +
			'MOD A, C\n' +
			'MOD C, 6\n' +
			'SET B, 123\n' +
			'MOD B, 0\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('mod registers', 3, this.cpu.ram.A);
		assertEquals('mod value', 4, this.cpu.ram.C);
		assertEquals('modbyzero', 0, this.cpu.ram.B);
	},
	
	testShl: function () {
		expectAsserts(4);

		// if the source is changed, adjust the expected value marked below
		var src =
			'SET A, 0x1234\n' +
			'SET C, 10\n' +
			'SHL A, C\n' +
			'SET X, O\n' +
			'SHL C, 6\n' +
			'SET Y, O\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('shl registers', 0xD000, this.cpu.ram.A);
		assertEquals('shl registers overflow', 0x48, this.cpu.ram.X);
		assertEquals('shl value', 0x280, this.cpu.ram.C);
		assertEquals('shl value overflow', 0, this.cpu.ram.Y);
	},
	
	testShr: function () {
		expectAsserts(4);

		// if the source is changed, adjust the expected value marked below
		var src =
			'SET A, 0x1234\n' +
			'SET C, 10\n' +
			'SHR A, C\n' +
			'SET X, O\n' +
			'SHR C, 6\n' +
			'SET Y, O\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('shr registers', 0x4, this.cpu.ram.A);
		assertEquals('shr registers overflow', 0x8d00, this.cpu.ram.X);
		assertEquals('shr value', 0x0, this.cpu.ram.C);
		assertEquals('shr value overflow', 0x2800, this.cpu.ram.Y);
	},
	
	testAnd: function () {
		expectAsserts(1);

		// if the source is changed, adjust the expected value marked below
		var src =
			'SET A, 0x1234\n' +
			'SET C, 0x00f0\n' +
			'AND A, C\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('and registers', 0x30, this.cpu.ram.A);
	},

	testBor: function () {
		expectAsserts(1);

		// if the source is changed, adjust the expected value marked below
		var src =
			'SET A, 0x1234\n' +
			'SET C, 0x0451\n' +
			'BOR A, C\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('bor registers', 0x1675, this.cpu.ram.A);
	},

	testXor: function () {
		expectAsserts(1);

		// if the source is changed, adjust the expected value marked below
		var src =
			'SET A, 0x1234\n' +
			'SET C, 0x4321\n' +
			'XOR A, C\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('xor registers', 0x5115, this.cpu.ram.A);
	},
});
