/*
---
description: Costumizable Minesweeper clone.

license: WTFPL

authors: Tim Baumann

provides: MooSweeper

...
*/

var Moosweeper = new Class({
	Implements: [Options, Events],
	
	MoosweeperCell: new Class({
		el: null,
		textWrapper: null,
		neighborCells: null,
		neighborMines: 0 /* -1 means: this is a mine itself */,

		initialize: function() {
			this.el = new Element('td');
			this.textWrapper = new Element('div');
			this.textWrapper.inject(this.el);
			
			this.unclear();
			
			this.el.addEvent('click', function() {
				if(this.el.hasClass('suspect')) {
					this.suspect();
				}
				else {
					this.discover();
				}
			}.bind(this));
			// right click to mark mine
			this.el.addEvent('contextmenu', function(e) {
				e.stop();
				this.suspect();
			}.bind(this));
		},
		inject: function(target) {
			this.el.inject(target);
		},
		setMine: function() {
			if(this.neighborMines != -1) {
				this.neighborMines = -1;
				return true;
			}
			else {
				return false;
			}
		},
		setText: function(text) {
			this.textWrapper.set('text', text);
		},
		unclear: function() {
			this.setText('?');
		},
		flag: function() {
			this.setText('!');
		},
		mine: function() {
			this.setText('•');
		},
		noMine: function() {
			this.setText(this.neighborMines.toString());
		},
		show: function() {
			if(!this.el.hasClass('discovered')) {
				this.el.addClass('discovered');
				this.el.addClass('neighbormines' + this.neighborMines);
				if(this.neighborMines == -1) {
					this.mine();
				}
				else {
					this.noMine();
				}
				this.el.removeEvents('click');
			}
		},
		discover: function() {
			if(!this.el.hasClass('discovered')) {
				this.el.removeClass('suspect');
				if(this.neighborMines == -1) {
					window.fireEvent('moosweeperlose');
				}
				else {
					this.show();
					window.fireEvent('moosweeperfieldcleared');
					if(this.neighborMines == 0) {
						this.neighborCells.each(function(item) {
							item.discover();
						});
					}
				}
			}
		},
		suspect: function() {
			if(!this.el.hasClass('discovered')) {
				// a toggle function
				if(this.el.hasClass('suspect')) {
					this.unclear();
					this.el.removeClass('suspect');
				}
				else {
					this.flag();
					this.el.addClass('suspect');
				}
			}
		}
	}),
	moosweeperCells: [],
	// the original windows minesweeper presets
	presets: $H({
		easy: {
			cols: 8,
			rows: 8,
			minesContingent: 0.16
		},
		medium: {
			rows: 16,
			cols: 16,
			minesContingent: 0.16
		},
		hard: {
			rows: 16,
			cols: 30,
			minesContingent: 0.21
		}
	}),
	options: {
		/* onWin: $empty,
		   onLose: $empty, */
		caption: 'Moosweeper',
		where: 'bottom',
		css: 'MooSweeperStyles/Clean.css',
		gameOptions: {
			where: 'bottom',
			interface: ''
		},
		preset: 'medium'
	},
	noMineFieldsLeft: null,
	el: null,
	cellsContainer: null,
	target: null,
	
	initialize: function(target, options) {
		this.target = $(target);
		this.prepareOptions(options);
		
		// styles
		this.setCSS();
			
		// make the element
		this.el = new Element('table', {
			'class': 'moosweeper',
			summary: 'Minesweeper field'
		});
		
		// caption
		if(this.options.caption) {
			new Element('caption', {
				text: this.options.caption
			}).inject(this.el);
		}
		
		// game options
		if(this.options.gameOptions.interface) {
			var gameOptionsElType = (this.options.gameOptions.where == 'top') ? 'thead' : 'tfoot';
			new Element(gameOptionsElType, {
				text: this.options.gameOptions.interface
			}).inject(this.el);
		}
		
		// tbody for cells
		this.cellsContainer = new Element('tbody');
		this.cellsContainer.inject(this.el);
		
		this.newGame();
		this.addEvents();
		
		this.el.inject(this.target, this.options.where);
	},
	// handles the presets
	prepareOptions: function(options) {
		// is there a preset with the specified name
		if($defined(options.preset) && $defined(this.presets.get(options.preset))) {
			this.options.preset = options.preset;
		} // else this.options.preset remains "medium"
		
		var preset = this.presets.get(this.options.preset);
		$extend(this.options, preset); // copy the preset into the options
		this.setOptions(options);
	},
	newGame: function(options) {
		if($defined(options)) {
			this.prepareOptions(options);
		}
		
		// Create the cells
		this.moosweeperCells.empty();
		this.options.rows.times(function() {
			var row = [];
			this.options.cols.times(function() {
				var cell = new this.MoosweeperCell();
				row.push(cell);
			}.bind(this));
			this.moosweeperCells.push(row);
		}.bind(this));
		
		// set neighborCells
		this.moosweeperCells.each(function(itemy, indexy) {
			itemy.each(function(itemx, indexx) {
				itemx.neighborCells = this.getNeighborCells(indexx, indexy);
			}.bind(this));
		}.bind(this))
		
		var cellsNumber = this.options.rows * this.options.cols;
		var minesNumber = (cellsNumber * this.options.minesContingent).round();
		this.noMineFieldsLeft = cellsNumber - minesNumber;
		
		// distribute mines over the field
		var i = 0;
		while(i < minesNumber) {
			var randomCell = this.moosweeperCells.getRandom().getRandom();
			if(randomCell.setMine()) {
				randomCell.neighborCells.each(function(item) {
					if(item.neighborMines != -1) {
						item.neighborMines++;
					}
				});
				i++;
			}
		}
		
		this.displayMoosweeper();
	},
	addEvents: function() {
		window.addEvents({
			'moosweeperfieldcleared': function() {
				this.fieldCleared();
			}.bind(this),
			'moosweeperlose': function() {
				this.fireEvent('lose');
			}.bind(this)
		});
	},
	getNeighborCells: function(x, y) {
		var neighborCells = [];
		var dx = [x - 1, x, x + 1];
		var dy = [y - 1, y, y + 1];
		
		dx.each(function(itemx) {
			dy.each(function(itemy) {
				if(!(itemx == x && itemy == y) && $defined(this.moosweeperCells[itemy]) && $defined(this.moosweeperCells[itemy][itemx])) { // we don't want the cell, only the cells around it
					neighborCells.push(this.moosweeperCells[itemy][itemx]);
				}
			}.bind(this));
		}.bind(this));
		
		return neighborCells;
	},
	displayMoosweeper: function() {
		this.cellsContainer.set('html', ''); // necessary for restarts
		
		// cells
		this.moosweeperCells.each(function(itemy) {
			var moosweeperRow = new Element('tr');
			itemy.each(function(itemx) {
				itemx.inject(moosweeperRow);
			});
			moosweeperRow.inject(this.cellsContainer);
		}.bind(this));
	},
	show: function() {
		this.moosweeperCells.each(function(itemy) {
			itemy.each(function(itemx) {
				itemx.show();
			});
		});
	},
	fieldCleared: function() {
		this.noMineFieldsLeft--;
		if(this.noMineFieldsLeft == 0) {
			this.fireEvent('win');
		}
	},
	setCSS: function(css) {
		if(css) {
			// remove old
			var cssEl = document.id('moosweepercss');
			if(cssEl) {
				cssEl.dispose();
			}
			// set option
			this.options.css = css;
		}
		
		if(this.options.css) {
			var inlineCSS = !this.options.css.test(/\.css$/i); // if not ends with ".css"
			if(inlineCSS) {
				cssEl = new Element('style', {
					type: 'text/css',
					id: 'moosweepercss',
					text: this.options.css
				});
			}
			else {
				cssEl = new Element('link', {
					rel: 'stylesheet',
					type: 'text/css',
					id: 'moosweepercss',
					href: this.options.css
				});
			}
			cssEl.inject(document.head);
		}
	}
});