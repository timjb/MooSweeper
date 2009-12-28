/*
---
description: Costumizable Minesweeper clone.

license: WTFPL

authors: Tim Baumann

provides: MooSweeper

...
*/

// get dir of this included js file (like http://css.dzone.com/news/query-string-aware-javascript)
Element.implement('getLastRecursive', function() {
	var lastChild = this.getLast();
	if(lastChild == null) {
		return this;
	} else {
		return lastChild.getLastRecursive();
	}
});

var scriptEl = $(document.documentElement).getLastRecursive();

if(scriptEl.get('id') == '_firebugConsole') {
	scriptEl = scriptEl.getPrevious().getLastRecursive();
}

if(scriptEl.get('tag') == 'script') {
	var jsDir = scriptEl.get('src').split('/');
	jsDir.pop();
	jsDir = jsDir.join('/');
	if(jsDir != '') {
		jsDir += '/';
	}
} else {
	var jsDir = 'MooSweeper/';
}

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
			this.showAll();
		},
		onLose: function(reason) {
			this.showMines();
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
		gameOptions: {
			where: 'top',
			interface: '<div class="third first">%newGame%</div>'+
			           '<div class="third second">%smiley%</div>'+
			           '<div class="third last">%minesLeft%̚</div>',
			smiley: {
				running: '8-)',
				lose:    'X-(',
				win:     ':-D',
				unsure:  ':-O'
			},
			status: {
				running: 'Running',
				lose:    'Lost!',
				win:     'Won!'
			},
			newGame: 'New Game'
		}
	},
	
	initialize: function(target, options) {
		this.prepareOptions(options);
		
		// references to the whole class
		[this.model, this.view].each(function(item) {
			item.that = this;
		}, this);
		
		this.model.initialize();
		this.view.initialize(target);
		
		this.fireEvent('newgame');
	},
	newGame: function() {
		this.model.newGame();
		this.view.newGame();
		
		this.fireEvent('newgame');
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
		gameOptions: $H(),
		
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
						this.that.fireEvent('celldiscovered');
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
		gameOptionsEl: null, // table > tfoot|thead
		gameOptionsEls: $H(),
		marked: 0, // how many mines are marked
		
		initialize: function(target) {
			this.target = document.id(target);
			
			this.setCSS();
			this.createField();
			this.makeGameOptions();
			
			this.table.inject(this.target, this.that.options.where);
		},
		newGame: function() {
			this.table.set('class', 'moosweeper running');
			this.marked = 0;
			this.that.fireEvent('markchanged');
			
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
				var isInline = this.that.options.css.test('{');
				if(isInline) {
					// inline styles
					cssEl = new Element('style', {
						type: 'text/css',
						text: this.that.options.css
					});
				} else {
					// external stylesheet
					if(this.that.options.css.test(/\.css$/i)) {
						var cssPath = this.that.options.css;
					}
					else {
						var cssPath = jsDir+'Styles/'+this.that.options.css+'.css';
					}
					cssEl = new Element('link', {
						rel: 'stylesheet',
						type: 'text/css',
						href: cssPath
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
				'class': 'moosweeper running',
				summary: 'Minesweeper field'
			});
			
			// add classes when game won or lost
			this.that.addEvents({
				win: function() {
					this.table.removeClass('running').addClass('win');
				}.bind(this),
				lose: function() {
					this.table.removeClass('running').addClass('lose');
				}.bind(this)
			});
			
			// tbody
			this.tbody = new Element('tbody', {
				events: {
					mouseup: function(event) {
						if(!this.that.model.finished) {
							var target = $(event.target);
							if(target.get('tag') == 'td') { // user has clicked on the border
								target = target.getElement('div');
							}
							if(target.get('tag') == 'div') {
								if(event.rightClick) {
									this.mark(target);
								} else {
									this.show(target);
								}
							}
						}
					}.bind(this),
					// disable contextmenu
					contextmenu: function(event) {
						return false;
					}.bind(this),
					// disable selection
					mousedown: function() { // Mozilla
						return false;
					},
					selectstart: function() { // IE
						return false;
					}
				}
			});
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
					this.marked--;
				} else {
					div.addClass('marked');
					div.set('text', this.that.options.symbols.marked);
					this.marked++;
				}
				this.that.fireEvent('markchanged');
			}
		},
		show: function(div, options) {
			if(!options) options = {};
			// options can be: force, removeMark and noAvalanche
			
			// if force is true, decover the cell even if it's marked
			if(div.hasClass('covered') && (options.force || !div.hasClass('marked'))) {
				if(options.removeMark) {
					if(div.hasClass('marked')) {
						div.removeClass('marked');
						this.marked--;
						this.that.fireEvent('markchanged');
					}
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
		},
		// game options
		makeGameOptions: function() {
			// game options
			if(this.that.options.gameOptions.interface) {
				// process interface string
				var interfaceHTML = this.that.options.gameOptions.interface;
				this.gameOptions.each(function(value, key) {
					interfaceHTML = interfaceHTML.replace('%'+key+'%', '<span title="'+key+'" class="gameoption '+key+'"></span>', 'g');
				});
				
				var gameOptionsElType = (this.that.options.gameOptions.where == 'top') ? 'thead' : 'tfoot';
				
				// tfoot|thead.gameoptions > tr > th[colspan]
				this.gameOptionsEl = new Element(gameOptionsElType, {
					'class': 'gameoptions'
				})
				.grab(new Element('tr')
					.grab(new Element('th', {
						colspan: this.that.options.cols,
						html: interfaceHTML
					}))
				);
				
				// add gameOptionEls to index
				this.gameOptionsEl.getElements('.gameoption').each(function(item) {
					var gameOptionName = item.get('class').split(' ')[1]; // the second class of the el
					if(!this.gameOptionsEls.has(gameOptionName)) {
						this.gameOptionsEls.set(gameOptionName, []);
					}
					this.gameOptionsEls[gameOptionName].push($(item));
				}, this);
				
				this.gameOptionsEls.each(function(value, key) {
					this.gameOptions[key].apply(this);
				}, this);
				
				this.gameOptionsEl.inject(this.table);
			}
		},
		gameOptions: $H({
			smiley: function() {
				var setSmiley = function(smiley) {
					var smileyText = (this.that.options.gameOptions.smiley[smiley]) ? this.that.options.gameOptions.smiley[smiley] : '';
					smileyEl = new Element('a', {
						href: '#',
						'class': smiley,
						title: smiley,
						text: smileyText,
						events: {
							mouseup: function() {
								this.that.newGame();
								return false;
							}.bind(this)
						}
					});
					this.setGameOption('smiley', smileyEl);
				}.bind(this);
				
				this.that.addEvents({
					newgame: setSmiley.pass('running'),
					win: setSmiley.pass('win'),
					lose: setSmiley.pass('lose')
				});
				this.tbody.addEvent('mousedown', function(event) {
					if(!this.that.model.finished && !event.rightClick) {
						setSmiley('unsure');
					}
				}.bind(this));
				window.addEvent('mouseup', function() {
					if(!this.that.model.finished) {
						setSmiley('running');
					}
				}.bind(this));
			},
			status: function() {
				var setStatus = function(status) {
					this.setGameOption('status', status);
				};
				
				this.that.addEvents({
					win: setStatus.pass(this.that.options.gameOptions.status.win, this),
					lose: setStatus.pass(this.that.options.gameOptions.status.lose, this),
					newgame: setStatus.pass(this.that.options.gameOptions.status.running, this)
				});
			},
			/*countdown: function() {
				
			},
			time: function() {
				
			},
			highscore: function() {
				
			},*/
			cells: function() {
				this.that.addEvent('newgame', function() {
					this.setGameOption('cells', this.that.model.cells);
				}, this);
			},
			mines: function() {
				this.that.addEvent('newgame', function() {
					this.setGameOption('mines', this.that.model.mines);
				}.bind(this));
			},
			cellsLeft: function() {
				var setCellsLeft = function() {
					this.setGameOption('cellsLeft', this.that.model.cellsLeft);
				}.bind(this);
				this.that.addEvents({
					celldiscovered: setCellsLeft,
					newgame: setCellsLeft
				});
			},
			minesLeft: function() {
				var setMinesLeft = function() {
					this.setGameOption('minesLeft', this.that.model.mines - this.marked);
				}.bind(this);
				
				this.that.addEvents({
					markchanged: setMinesLeft,
					newgame: setMinesLeft
				});
			},
			newGame: function() {
				this.setGameOption('newGame', new Element('a', {
					href: '#',
					text: this.that.options.gameOptions.newGame,
					events: {
						click: function() {
							this.that.newGame();
							return false;
						}.bind(this)
					}
				}));
			}
		}),
		setGameOption: function(option, value) {
			if(this.gameOptionsEls.has(option)) {
				this.gameOptionsEls.get(option).each(function(item) {
					if($type(value) === 'element') {
						item.set('html', '');
						var el = value.clone();
						el.cloneEvents(value);
						el.inject(item);
					}
					else {
						item.set('html', value);
					}
				});
			}
		}
	}
});