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
