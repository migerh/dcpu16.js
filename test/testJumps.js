/*
 *  Js-Test-Driver Test Suite for Generic JavaScript language tests
 *  http://code.google.com/p/js-test-driver
 */

TestCase("Jumps", {
	cpu: null,
	
	setUp: function () {
		this.cpu = new DCPU16.PC();
	},

	tearDown: function () {
	},
	
	testLabels: function () {
		expectAsserts(2);
		
		var src =
			'JSR label\n' +
			'SET B, 0xA\n' +
			':label SET A, 0xB\n' +
			':halt SET PC, halt';
		try {
		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(5);
		} catch (e) {
			console.log(e);
		}
		
		assertEquals('jump failed A', 0xB, this.cpu.ram.A);
		assertEquals('jump failed B', 0x0, this.cpu.ram.B);
	},
	
	testJsrWithBackloop: function () {
		expectAsserts(2);
		
		// this pollutes the stack. but it's valid code and
		// it should work for at least some steps
		var src =
			':loop JSR label\n' +
			'SET B, 0xA\n' +
			':label SET A, 0xB\n' +
			'SET PC, loop\n' +
			':halt SET PC, halt';
		try {
			this.cpu.load(DCPU16.asm(src).bc);
			this.cpu.steps(50);
		} catch (e) {
			console.log(e);
		}
		
		assertEquals('jump failed A', 0xB, this.cpu.ram.A);
		assertEquals('jump failed B', 0x0, this.cpu.ram.B);
	},
	
	testJsrWithIfe: function () {
		expectAsserts(2);
		
		// this pollutes the stack. but it's valid code and
		// it should work for at least some steps
		var src =
			'SET A, 0x10\n' +
			
			'IFE A, 0xA\n' +
			'JSR label\n' +
			'SET B, 0xA\n' +
			
			':label SET A, 0xB\n' +
			':halt SET PC, halt';
		try {
			this.cpu.load(DCPU16.asm(src).bc);
			this.cpu.steps(30);
		} catch (e) {
			console.log(e);
		}
		
		assertEquals('jump failed A', 0xB, this.cpu.ram.A);
		assertEquals('jump failed B', 0xA, this.cpu.ram.B);
	},
	
	testLabelsWithX: function () {
		expectAsserts(2);
		
		var src =
			'JSR laxbel\n' +
			'SET B, 0xA\n' +
			':laxbel SET A, 0xB\n' +
			':halt SET PC, halt';
		
		this.cpu.load(DCPU16.asm(src).bc);
		this.cpu.steps(5);
		
		assertEquals('jump failed A', 0xB, this.cpu.ram.A);
		assertEquals('jump failed B', 0x0, this.cpu.ram.B);
	}
});
