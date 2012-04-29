
var DCPU16 = DCPU16 || {};

(function () {

	var _ = {
		font: [0xB79E, 0x388E, 0x722C, 0x75F4, 0x19BB, 0x7F8F, 0x85F9, 0xB158, 0x242E, 0x2400, 0x082A, 0x0800, 0x0008, 0x0000, 0x0808, 0x0808,
		0x00FF, 0x0000, 0x00F8, 0x0808, 0x08F8, 0x0000, 0x080F, 0x0000, 0x000F, 0x0808, 0x00FF, 0x0808, 0x08F8, 0x0808, 0x08FF, 0x0000,
		0x080F, 0x0808, 0x08FF, 0x0808, 0x6633, 0x99CC, 0x9933, 0x66CC, 0xFEF8, 0xE080, 0x7F1F, 0x0701, 0x0107, 0x1F7F, 0x80E0, 0xF8FE,
		0x5500, 0xAA00, 0x55AA, 0x55AA, 0xFFAA, 0xFF55, 0x0F0F, 0x0F0F, 0xF0F0, 0xF0F0, 0x0000, 0xFFFF, 0xFFFF, 0x0000, 0xFFFF, 0xFFFF,
		0x0000, 0x0000, 0x005F, 0x0000, 0x0300, 0x0300, 0x3E14, 0x3E00, 0x266B, 0x3200, 0x611C, 0x4300, 0x3629, 0x7650, 0x0002, 0x0100,
		0x1C22, 0x4100, 0x4122, 0x1C00, 0x1408, 0x1400, 0x081C, 0x0800, 0x4020, 0x0000, 0x0808, 0x0800, 0x0040, 0x0000, 0x601C, 0x0300,
		0x3E49, 0x3E00, 0x427F, 0x4000, 0x6259, 0x4600, 0x2249, 0x3600, 0x0F08, 0x7F00, 0x2745, 0x3900, 0x3E49, 0x3200, 0x6119, 0x0700,
		0x3649, 0x3600, 0x2649, 0x3E00, 0x0024, 0x0000, 0x4024, 0x0000, 0x0814, 0x2200, 0x1414, 0x1400, 0x2214, 0x0800, 0x0259, 0x0600,
		0x3E59, 0x5E00, 0x7E09, 0x7E00, 0x7F49, 0x3600, 0x3E41, 0x2200, 0x7F41, 0x3E00, 0x7F49, 0x4100, 0x7F09, 0x0100, 0x3E41, 0x7A00,
		0x7F08, 0x7F00, 0x417F, 0x4100, 0x2040, 0x3F00, 0x7F08, 0x7700, 0x7F40, 0x4000, 0x7F06, 0x7F00, 0x7F01, 0x7E00, 0x3E41, 0x3E00,
		0x7F09, 0x0600, 0x3E61, 0x7E00, 0x7F09, 0x7600, 0x2649, 0x3200, 0x017F, 0x0100, 0x3F40, 0x7F00, 0x1F60, 0x1F00, 0x7F30, 0x7F00,
		0x7708, 0x7700, 0x0778, 0x0700, 0x7149, 0x4700, 0x007F, 0x4100, 0x031C, 0x6000, 0x417F, 0x0000, 0x0201, 0x0200, 0x8080, 0x8000,
		0x0001, 0x0200, 0x2454, 0x7800, 0x7F44, 0x3800, 0x3844, 0x2800, 0x3844, 0x7F00, 0x3854, 0x5800, 0x087E, 0x0900, 0x4854, 0x3C00,
		0x7F04, 0x7800, 0x047D, 0x0000, 0x2040, 0x3D00, 0x7F10, 0x6C00, 0x017F, 0x0000, 0x7C18, 0x7C00, 0x7C04, 0x7800, 0x3844, 0x3800,
		0x7C14, 0x0800, 0x0814, 0x7C00, 0x7C04, 0x0800, 0x4854, 0x2400, 0x043E, 0x4400, 0x3C40, 0x7C00, 0x1C60, 0x1C00, 0x7C30, 0x7C00,
		0x6C10, 0x6C00, 0x4C50, 0x3C00, 0x6454, 0x4C00, 0x0836, 0x4100, 0x0077, 0x0000, 0x4136, 0x0800, 0x0201, 0x0201, 0x0205, 0x0200],
		
		color: function (bits, palette, dcpu) {
			var cb;
			
			bits = bits & 0xf;
			if (palette === 0) {
				cb = 160;
			
				if (bits & 0x8) {
					cb = 255;
				}
			
				return {
					r: bits & 0x4 ? cb : 0,
					g: bits & 0x2 ? cb : 0,
					b: bits & 0x1 ? cb : 0
				};
			} else {
				bits = dcpu.getWord(palette + bits);
				return {
					r: ((bits >>> 8) & 0xf) * 17,
					g: ((bits >>> 4) & 0xf) * 17,
					b: (bits & 0xf) * 17
				};
			}
		}
	};

	DCPU16.NE_LEM1802 = function (dcpu) {
		this.description = 'NYA Elektriska LEM1802';
		this.id = 0x7349f615;
		this.version = 0x1802;
		this.manufacturer = 0x1c6c8b36;
		
		this.defWidth = 128;
		this.defHeight = 96;

		this.width = 128;
		this.height = 96;
		
		this.vram = 0x8000;
		this.font = 0;
		this.palette = 0;
		
		this.currentBorder = 0;
		
		this.events = {};
		
		this.on = function (event, handler, scope) {
			this.events[event] = this.events[event] || [];
			handler.scope = DCPU16.def(scope, this);
			this.events[event].push(handler);
		};
			
		this.off = function (event, handler) {
			var i;
				
			if (this.events[event]) {
				for (i = 0; i < this.events[event].length; i++) {
					if (this.events[event][i] === handler) {
						this.events[event].splice(i, 1);
						break;
					}
				}
			}
		};
			
		this.trigger = function (event) {
			var i, args = Array.prototype.slice.call(arguments, 1);

			if (this.events[event]) {
				for (i = 0; i < this.events[event].length; i++) {
					this.events[event][i].apply(this.events[event][i].scope, args);
				}
			}
		};
		
		this.int = function () {
			var b = this.dcpu.ram.B;

			switch (this.dcpu.ram.A) {
			case 0: // MEM_MAP_SCREEN
				this.vram = b;
				break;
			case 1: // MEM_MAP_FONT
				this.font = b;
				break;
			case 2: // MEM_MAP_PALETTE
				this.palette = b;
				b = this.currentBorder;
				// run through and trigger an update of the border
			case 3: // SET_BORDER_COLOR
				this.currentBorder = b;
				b = _.color(b, this.palette, this.dcpu);
				b = ['#', DCPU16.printHex(b.r, 2, false), DCPU16.printHex(b.g, 2, false), DCPU16.printHex(b.b, 2, false)].join('');
				this.trigger('border', b);
				break;
			}
		};
		
		this.drawCharacter = function (char, fg, bg, x, y, buf) {
			var i, j, k, l, line, index, color,
				scale = this.width / this.defWidth;
				
			x = x * /* one line */ this.width * /* 4 values for each pixel */ 4 * /* height of char */ 8 * scale;
			y = y * /* width of char */4 * /* 4 values for each pixel */ 4 * scale;
			
			for (i = 0; i < 4; i++) {
				index = x + y + i * 4 * scale;
				line = (char >>> ((3 - i) << 3)) & 0xff;

				for (j = 0; j < 8; j++) {
					color = bg;
					if (line & (1 << j)) {
						color = fg;
					}

					for (k = 0; k < scale; k++) {
						for (l = 0; l < scale; l++) {
							buf.data[index + (l << 2)] = color.r;
							buf.data[index + (l << 2) + 1] = color.g;
							buf.data[index + (l << 2) + 2] = color.b;
							buf.data[index + (l << 2) + 3] = 255;
						}
						index += (this.width << 2);
					}
				}
			}
			
			return buf;
		};
		
		this.drawScreen = function (canvas, width, height) {
			if (!this.vram) {
				return;
			}

			if (!canvas || width % 128 !== 0 || height % 96 !== 0 || Math.abs(height/width - 0.75) > 0.001) {
				throw new Error('No canvas given or canvas width/height was not a multiple of 128 resp. 96 or wrong aspect ratio.');
			}
			
			this.width = width;
			this.height = height;

			var buf = canvas.createImageData(this.width, this.height),
				i, val, char, fg, bg, x, y;
				
			for (i = 0; i < 0x180; i++ ) {
				x = Math.floor(i / 32);
				y = i % 32;
				
				val = this.dcpu.getWord(this.vram + i);
				
				if (this.font) {
					char = (this.dcpu.getWord(this.font + ((val & 0x7f) << 1)) << 16) | (this.dcpu.getWord(this.font + ((val & 0x7f) << 1) + 1));
				} else {
					char = (_.font[((val & 0x7f) << 1)] << 16) | (_.font[((val & 0x7f) << 1) + 1]);
				}
				
				bg = _.color(val >>> 8, this.palette, this.dcpu);
				fg = _.color(val >>> 12, this.palette, this.dcpu);
				
				buf = this.drawCharacter(char, fg, bg, x, y, buf);
			}

			canvas.putImageData(buf, 0, 0);
		};

		this.dcpu = dcpu;
		this.dcpu.add(this);
	};

})();
