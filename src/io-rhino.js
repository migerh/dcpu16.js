/**

  This file is part of dcpu16.js
  
  Copyright 2012 Michael Gerhaeuser
  
  https://github.com/migerh/dcpu16.js
  
  dcpu16.js is free software; You can redistribute it and/or
  modify it under the terms of the MIT license. You should have
  received a copy of the MIT license along with dcpu16.js. If not,
  see http://www.opensource.org/licenses/MIT

 **/
 
var DCPU16 = DCPU16 || {};

(function () {
	DCPU16.IO = {
		IOException: function (msg) {
			this.name = 'IOException';
			this.message = msg;
		},
	
		hasStorage: function () {
			return true;
		},
	
		read: function (name) {
			var src = new String();
	
			if (new java.io.File(name).exists()) {
				src = readFile(name);
			} else {
				throw new this.IOException("Unable to open file '" + name + "'");
			}
	
			return src;
		},

		save: function (name, content) {
			var f = new java.io.PrintWriter(name);
		
			if (f) {
				f.write(content);
				f.close();
			} else {
				throw new this.IOException("Unable to write '" + name + "'");
				return false;
			}
	
			return true;
		}
	};
	
	DCPU16.IO.IOException.prototype = Error.prototype;
})();
