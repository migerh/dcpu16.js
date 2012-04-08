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
    	
    	this.cpu.load(DCPU16.asm(src));
    	this.cpu.steps(5);
    	
    	assertEquals('addition failed X', 5, this.cpu.ram.X);
    	assertEquals('set failed Y', 3, this.cpu.ram.Y);
    }
});
