/**

  This file is part of dcpu16.js
  
  Copyright 2012 Michael Gerhaeuser
  
  https://github.com/migerh/dcpu16.js
  
  dcpu16.js is free software; You can redistribute it and/or
  modify it under the terms of the MIT license. You should have
  received a copy of the MIT license along with dcpu16.js. If not,
  see http://www.opensource.org/licenses/MIT

 **/
 
 
DCPU16.IO = {
	IOException: function (msg) {
		this.name = 'IOException';
		this.message = msg;
	},
	
	hasStorage: function () {
		return typeof localStorage !== 'undefined';
	},
	
	read: function (name) {
		var r;
		
		if (!this.hasStorage()) {
			throw new IOException('No storage available.');
		}
		
		r = localStorage.getItem(name);
		if (r !== null) {
			return r;
		} else {
			throw new IOException('File not found');
		}
	},
	
	save: function (name, content) {
		if (!this.hasStorage()) {
			throw new IOException('No storage available.');
		}
		
		localStorage.setItem(name, content);
	}
};

DCPU16.IO.IOException.prototype = Error.prototype;
