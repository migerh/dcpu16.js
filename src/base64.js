base64 = function (data) {
	// taken from https://github.com/Stuk/jszip
	var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
		output = "",
		chr1, chr2, chr3, enc1, enc2, enc3, enc4,
		i = 0;

	while (i < data.length) {
		chr1 = data.charCodeAt(i++);
		chr2 = data.charCodeAt(i++);
		chr3 = data.charCodeAt(i++);

		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
		enc4 = chr3 & 63;

		if (isNaN(chr2)) {
		   enc3 = enc4 = 64;
		} else if (isNaN(chr3)) {
		   enc4 = 64;
		}

		output = output + _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
	}

	return output;
};
