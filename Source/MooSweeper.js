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
	
	// the original m$ windows minesweeper presets
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
		// events
		onWin: function() {
			this.view.table.addClass('win');
			this.showAll();
			alert('You win!');
			this.newGame();
		},
		onLose: function(reason) {
			this.view.table.addClass('lose');
			this.showMines();
			var msg = 'You lose';
			if(reason == 'time') {
				msg += '. Time\'s up.';
			}
			alert(msg);
			this.newGame();
		},
		
		// model
		preset: 'medium',
		/* => rows: 16,
		      cols: 16,
		      minesContingent: 0.16, */
		
		// view
		caption: 'Moosweeper',
		where: 'bottom',
		css: 'MooSweeperStyles/Clean.css',
		symbols: {
			covered: '?',
			marked:  '!',
			mine:    '•'
		},
		/*gameOptions: {
			where: 'bottom',
			interface: '%status%, %newgame%, %countdown%'
		}*/
	},
	
	initialize: function(target, options) {
		this.prepareOptions(options);
		
		// references to the whole class
		[this.model, this.view].each(function(item) {
			item.that = this;
		}, this);
		
		this.model.initialize();
		this.view.initialize(target);
	},
	newGame: function() {
		this.model.newGame();
		this.view.newGame();
	},
	// handles the presets
	prepareOptions: function(options) {
		// is there a preset with the specified name
		if($defined(options.preset) && $defined(this.presets.get(options.preset))) {
			this.options.preset = options.preset;
		} // else this.options.preset remains "medium"

		var preset = this.presets.get(this.options.preset);
		$extend(this.options, preset); // load the preset
		
		this.setOptions(options);
	},
	// API
	setCSS: function(css) {
		this.view.setCSS(css);
	},
	showAll: function() {
		this.view.showAll();
	},
	showMines: function() {
		this.view.showMines();
	},
	
	model: {
		field: [],
		mineCells: [], // positions of the mines
		gameOptions: $H({}),
		
		cells: null,
		mines: null,
		cellsLeft: null, // if you have a 5x5 field with 6 mines, you have to discover 19 cells. Counts down.
		
		finished: false,
		
		initialize: function() {
			this.calculateCells();
			this.createField();
			this.distributeMines();
		},
		newGame: function() {
			this.finished = false;
			this.initialize();
		},
		calculateCells: function() {
			this.cells = this.that.options.cols * this.that.options.rows;
			this.mines = (this.cells * this.that.options.minesContingent).round();
			this.cellsLeft = this.cells - this.mines;
		},
		createField: function() {
			this.field = [];
			this.that.options.cols.times(function(x) {
				this.field[x] = [];
				this.that.options.rows.times(function() {
					this.field[x].push(0);
				}, this);
			}, this);
		},
		distributeMines: function() {
			this.mineCells = [];
			var i = 0;
			while(i < this.mines) {
				var x = $random(0, this.that.options.cols - 1);
				var y = $random(0, this.that.options.rows - 1);
				
				// if not already a mine
				if(this.field[x][y] >= 0) {
					this.field[x][y] = -1;
					this.mineCells.push([x, y]);
					
					// increase the mines count of the neighbor cells
					this.getNeighbors(x, y).each(function(item) {
						if(this.field[item[0]][item[1]] >= 0) { // not a mine
							this.field[item[0]][item[1]] += 1;
						}
					}, this);
					
					i++;
				}
			}
		},
		get: function(x, y) {
			if($defined(this.field[x][y])) {
				var minesCount = this.field[x][y];
				if(!this.finished) {
					// fire events
					if(minesCount == -1) {
						this.finished = true;
						this.that.fireEvent('lose', 'mine');
						return -2;
					} else {
						this.cellsLeft--;
						if(this.cellsLeft <= 0) {
							this.finished = true;
							this.that.fireEvent('win');
							return -2;
						}
					}
				}
				return minesCount;
			}
		},
		getNeighbors: function(x, y) {
			// increase the mines count of the neighbor cells	
			var neighbors = [];
			var dx = [x - 1, x, x + 1];
			var dy = [y - 1, y, y + 1];
			
			dx.each(function(nx) {
				if($defined(this.field[nx])) {
					dy.each(function(ny) {
						if(!(nx == x && ny == y) && $defined(this.field[nx][ny])) { // we don't want the cell, only the cells around it
							neighbors.push([nx, ny]);
						}
					}, this);
				}
			}, this);
			
			return neighbors;
		},
	},
	
	view: {
		// elements
		table: null,
		tbody: null,
		target: null, // where to insert the table
		divs: [],
		//gameOptionsEl: null, // table > tfoot|thead
		
		initialize: function(target) {
			this.target = document.id(target);
			
			this.setCSS();
			this.createField();
			//this.makeGameOptions();
			
			this.table.inject(this.target, this.that.options.where);
		},
		newGame: function() {
			this.table.set('class', 'moosweeper');
			
			// cells
			this.divs.each(function(item) {
				item.each(function(item) {
					item.set({
						'class': 'covered',
						text: this.that.options.symbols.covered
					});
				}, this);
			}, this);
		},
		setCSS: function(css) {
			if(css) {
				this.that.options.css = css;
			}
			
			if(this.that.options.css) {
				var isInline = !this.that.options.css.test(/\.css$/i); // if not ends with ".css"
				if(isInline) {
					// inline styles
					cssEl = new Element('style', {
						type: 'text/css',
						text: this.that.options.css
					});
				} else {
					// external stylesheet
					cssEl = new Element('link', {
						rel: 'stylesheet',
						type: 'text/css',
						href: this.that.options.css
					});
				}
				if(this.cssEl) {
					cssEl.replaces(this.cssEl); // replace old CSS element
				} else {
					cssEl.inject(document.head);
				}
				this.cssEl = cssEl;
			}
		},
		createField: function() {
			// table
			this.table = new Element('table', {
				'class': 'moosweeper',
				summary: 'Minesweeper field',
				events: {
					click: function(event) {
						var target = $(event.target);
						if(target.get('tag') == 'div') this.show(target);
					}.bind(this),
					contextmenu: function(event) {
						var target = $(event.target);
						if(target.get('tag') == 'div') this.mark(target);
						return false;
					}.bind(this)
				}
			});
			
			// tbody
			this.tbody = new Element('tbody');
			this.tbody.inject(this.table);
			
			// create cells
			this.that.options.rows.times(function(y) {
				var tr = new Element('tr');
				this.divs[y] = [];
				this.that.options.cols.times(function(x) {
					var td = new Element('td');
					var div = new Element('div', {
						'class': 'covered',
						text: this.that.options.symbols.covered
					});
					div.store('x', x);
					div.store('y', y);
					this.divs[y][x] = div;
					div.inject(td);
					td.inject(tr);
				}, this);
				tr.inject(this.tbody);
			}, this);
			
			// caption
			if(this.that.options.caption) {
				new Element('caption', {
					text: this.that.options.caption
				}).inject(this.table);
			}
		},
		mark: function(div) {
			if(div.hasClass('covered')) {
				// toggle function
				if(div.hasClass('marked')) {
					div.removeClass('marked');
					div.set('text', this.that.options.symbols.covered);
				} else {
					div.addClass('marked');
					div.set('text', this.that.options.symbols.marked);
				}
			}
		},
		show: function(div, options) {
			if(!options) options = {};
			// options can be: force, removeMark and noAvalanche
			
			// if force is true, decover the cell even if it's marked
			if(div.hasClass('covered') && (options.force || !div.hasClass('marked'))) {
				if(options.removeMark) {
					div.removeClass('marked');
				}
				
				var x = div.retrieve('x');
				var y = div.retrieve('y');
				
				var minesCount = this.that.model.get(x, y);
				
				if(minesCount != -2) { // -2 means: game is finished => event was fired, in the event a new game can be started => don't show the cell
					div.removeClass('covered').addClass('discovered');
					if(minesCount == -1) {
						div.set('text', this.that.options.symbols.mine);
						div.addClass('mine');
					} else {
						div.set('text', minesCount);
						div.addClass('minescount'+minesCount);
						
						if(!options.noAvalanche && minesCount === 0) { // there's no mine around, so we can discover all neighbor cells
							this.that.model.getNeighbors(x, y).each(function(item) {
								var neighborDiv = this.getDiv(item[0], item[1]);
								if(neighborDiv.hasClass('covered')) {
									this.show(neighborDiv, {
										force: true,
										removeMark: true
									});
								}
							}, this);
						}
					}
				}
			}
		},
		showAll: function() {
			this.divs.each(function(item) {
				item.each(function(item) {
					if(item.hasClass('covered')) {
						this.show(item, {
							force: true,
							noAvalanche: true
						})
					};
				}, this);
			}, this);
		},
		showMines: function() {
			this.that.model.mineCells.each(function(item) {
				var div = this.getDiv(item[0], item[1]);
				if(div.hasClass('covered')) {
					this.show(div, {
						force: true
					});
				}
			}, this);
		},
		getDiv: function(x, y) {
			return this.divs[y][x];
		}
		/*,
		makeGameOptions: function() {
			// game options
			if(this.options.gameOptions.interface) {
				// process interface string
				var interfaceHTML = this.options.gameOptions.interface;
				['status', 'countdown', 'newgame'].each(function(item) {
					interfaceHTML = interfaceHTML.replace('%'+item+'%', '<span class="gameoption '+item+'"></span>');
				});
				
				var gameOptionsElType = (this.options.gameOptions.where == 'top') ? 'thead' : 'tfoot';
				
				// tfoot|thead.gameoptions > tr > th[colspan]
				this.gameOptionsEl = new Element(gameOptionsElType, {
					'class': 'gameoptions'
				}).grab(new Element('tr').grab(new Element('th', {
					colspan: this.options.cols,
					html: interfaceHTML
				})));
				
				// add gameOptionEls to index
				this.gameOptionsEl.getElements('.gameoption').each(function(item) {
					var gameOptionName = item.get('class').split(' ')[1]; // the second class of the el
					if(!this.gameOptions.has(gameOptionName)) {
						this.gameOptions.set(gameOptionName, []);
					}
					this.gameOptions.set(gameOptionName, this.gameOptions.get(gameOptionName).push(item));
				}, this);
				
				this.gameOptionsEl.inject(this.view.table);
			}
		},
		setGameOption: function(option, value) {
			if(this.gameOptionsEls.option) {
				this.gameOptionsEls.get(option).each(function() {
					this.set('text', value);
				});
			}
		},
		showAll: function() {
			this.eachField(function(item) {
				item.show();
			});
		},
		showMines: function() {
			this.mines.each(function(item) {
				item.show();
			});
		}*/
	}
});