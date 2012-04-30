
// This code is part of JSZip:

/**

JSZip - A Javascript class for generating Zip files
<http://stuartk.com/jszip>

(c) 2009 Stuart Knightley <stuart [at] stuartk.com>
Licenced under the GPLv3 and the MIT licences

Usage:
   zip = new JSZip();
   zip.file("hello.txt", "Hello, World!").add("tempfile", "nothing");
   zip.folder("images").file("smile.gif", base64Data, {base64: true});
   zip.file("Xmas.txt", "Ho ho ho !", {date : new Date("December 25, 2007 00:00:01")});
   zip.remove("tempfile");

   base64zip = zip.generate();

**/

/**


  Modified by Michael Gerhaeuser, 2012 for dcpu16.js
  
  https://github.com/migerh/dcpu16.js
  
  dcpu16.js is free software; You can redistribute it and/or
  modify it under the terms of the MIT license. You should have
  received a copy of the MIT license along with dcpu16.js. If not,
  see http://www.opensource.org/licenses/MIT

 **/


Base64 = {
	keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	
	encode: function (data) {
		var output = "",
			chr1, chr2, chr3, enc1, enc2, enc3, enc4,
			i = 0;

		while (i < data.length) {
			chr1 = data[i++];
			chr2 = data[i++];
			chr3 = data[i++];

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if (isNaN(chr2)) {
			   enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
			   enc4 = 64;
			}

			output = output + this.keyStr.charAt(enc1) + this.keyStr.charAt(enc2) + this.keyStr.charAt(enc3) + this.keyStr.charAt(enc4);
		}

		return output;
	}
};
