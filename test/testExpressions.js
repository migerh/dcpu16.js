/*
 *  Js-Test-Driver Test Suite for Generic JavaScript language tests
 *  http://code.google.com/p/js-test-driver
 */

TestCase("Expressions", {
	cpu: null,
	
	setUp: function () {
		this.cpu = new DCPU16.PC();
	},

	tearDown: function () {
	},
	
	testAdd: function () {
		expectAsserts(1);

		var src =
			'SET X, 1+1\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('addition', 2, this.cpu.ram.X);
	},
	
	testSub: function () {
		expectAsserts(1);

		var src =
			'SET X, 1-1\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('subtraction', 0, this.cpu.ram.X);
	},
	
	testMul: function () {
		expectAsserts(1);

		var src =
			'SET X, 2*3\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('multiplication', 6, this.cpu.ram.X);
	},
	
	testDiv: function () {
		expectAsserts(1);

		var src =
			'SET X, 10/3\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('division', 3, this.cpu.ram.X);
	},
	
	testAddSubOrder: function () {
		expectAsserts(1);

		var src =
			'SET X, 1+4-2+5\n' +
			
			':halt SET PC, halt';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('add sub order', 8, this.cpu.ram.X);
	},
	
	testPEMDAS: function () {
		expectAsserts(2);

		var src =
			'SET X, (1+1)*3\n' +
			'SET Y, 1+1*3\n' +
			
			'SUB PC, 1';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);
		
		assertEquals('pemdas bracket', 6, this.cpu.ram.X);
		assertEquals('pemdas', 4, this.cpu.ram.Y);
	},

	testWhitespaces: function () {
		expectAsserts(1);

		var src =
			'SET X, 0x8000 + 32 * 2 + 2\n' +
			
			'SUB PC, 1';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);

		assertEquals('whitespaces', 32834, this.cpu.ram.X);
	},
	
	testUnaryMinus: function () {
		expectAsserts(1);

		var src =
			'SET X, -1\n' +
			
			'SUB PC, 1';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);

		assertEquals('unary minus', 0xffff, this.cpu.ram.X);
	},
	
	testUnaryNot: function () {
		expectAsserts(3);

		var src =
			'SET X, ~0xff\n' +
			'SET Y, ~((0xf0 + 0xf) << 8)\n' +
			'SET Z, (0xf0 + 0xf) << 8\n' +
			
			'SUB PC, 1';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);

		assertEquals('unary not', 0xff00, this.cpu.ram.X);
		assertEquals('unary not shift', 0xff00, this.cpu.ram.Z);
		assertEquals('unary not 2', 0xff, this.cpu.ram.Y);
	},
	
	testUnaryPlus: function () {
		expectAsserts(1);

		var src =
			'SET X, +0xabcd\n' +
			
			'SUB PC, 1';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);

		assertEquals('unary plus', 0xabcd, this.cpu.ram.X);
	},
	
	testSHL: function () {
		expectAsserts(1);

		var src =
			'SET X, 0xab << 8\n' +
			
			'SUB PC, 1';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);

		assertEquals('shl expression', 0xab00, this.cpu.ram.X);
	},
	
	testSHR: function () {
		expectAsserts(1);

		var src =
			'SET X, 0xab >> 4\n' +
			
			'SUB PC, 1';

		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(20);

		assertEquals('shr expression', 0xa, this.cpu.ram.X);
	}
});
