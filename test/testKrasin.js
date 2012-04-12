/*
 *  Js-Test-Driver Test Suite for Generic JavaScript language tests
 *  http://code.google.com/p/js-test-driver
 */

TestCase("Krasin", {
	cpu: null,
	
    setUp: function () {
    	this.cpu = new DCPU16.PC();
    },

    tearDown: function () {
    },
    
    'test-add.s': function () {
    	expectAsserts(2);
    	
    	var src =
    		'SET X, 2\n' +
    		'SET Y, 3\n' +
    		'ADD X, Y\n' +
    		':halt SET PC, halt';
    	
    	this.cpu.load(DCPU16.asm(src).bc);
    	this.cpu.steps(5);
    	
    	assertEquals('addition failed X', 5, this.cpu.ram.X);
    	assertEquals('set failed Y', 3, this.cpu.ram.Y);
    },
    
    'test-ife.s': function () {
    	expectAsserts(2);
    	
    	var src =
			'SET X, 5\n' +
			'SET Y, 3\n' +
			'IFE X, Y\n' +
			'SET X, 0\n' +
    		':halt SET PC, halt';
    	
    	this.cpu.load(DCPU16.asm(src).bc);
    	this.cpu.steps(5);
    	
    	assertEquals('IFE failed X', 5, this.cpu.ram.X);
    	assertEquals('set failed Y', 3, this.cpu.ram.Y);
    },
    
	'test-ife.s': function () {
    	expectAsserts(3);
    	
    	var src =
		    'SET X, 100\n' +
			'SET [X], 15\n' +
			'SET Y, [0+X]\n' +
			'SUB X, 2\n' +
			'SET [2+X], 10\n' +
			'SET Z, [2+X]\n' +
    		':halt SET PC, halt';
    	
    	this.cpu.load(DCPU16.asm(src).bc);
    	this.cpu.steps(10);
    	
    	assertEquals('failed X', 98, this.cpu.ram.X);
    	assertEquals('failed Y', 15, this.cpu.ram.Y);
    	assertEquals('failed Z', 10, this.cpu.ram.Z);
    },
    
    'test-set-hex-ffff.s': function () {
    	expectAsserts(2);
    	
    	var src =
	    	'SET X, 0xFFFF\n' +
	    	'SET Y, 0xF\n' +
    		':halt SET PC, halt';
    	
    	this.cpu.load(DCPU16.asm(src).bc);
    	this.cpu.steps(3);
    	
    	assertEquals('failed X', 0xFFFF, this.cpu.ram.X);
    	assertEquals('failed Y', 0xF, this.cpu.ram.Y);
    },
    
    'test-sub.s': function () {
    	expectAsserts(2);
    	
    	var src =
		    'SET X, 10\n' +
			'SET Y, 3\n' +
			'SUB X, Y\n' +
    		':halt SET PC, halt';
    	
    	this.cpu.load(DCPU16.asm(src).bc);
    	this.cpu.steps(5);
    	
    	assertEquals('failed X', 7, this.cpu.ram.X);
    	assertEquals('failed Y', 3, this.cpu.ram.Y);
    }
});
