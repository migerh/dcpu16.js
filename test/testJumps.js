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
    	
    	this.cpu.load(DCPU16.asm(src));
    	this.cpu.steps(5);
    	
    	assertEquals('jump failed A', 0xB, this.cpu.ram.A);
    	assertEquals('jump failed B', 0x0, this.cpu.ram.B);
    },
    
    testLabelsWithX: function () {
    	expectAsserts(2);
    	
    	var src =
    		'JSR laxbel\n' +
    		'SET B, 0xA\n' +
    		':laxbel SET A, 0xB\n' +
    		':halt SET PC, halt';
    	
    	this.cpu.load(DCPU16.asm(src));
    	this.cpu.steps(5);
    	
    	assertEquals('jump failed A', 0xB, this.cpu.ram.A);
    	assertEquals('jump failed B', 0x0, this.cpu.ram.B);
    }
});
