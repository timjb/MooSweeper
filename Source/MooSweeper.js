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
// Firebug could be the last element
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


// save Events and fire them later
var FireLater = new Class({
	Implements: Events,
	
	fireLaterEvents: [],
	fireLater: function() {
		this.fireLaterEvents.push($splat(arguments));
	},
	fireNow: function() {
		var es = $A(this.fireLaterEvents);
		this.fireLaterEvents = [];
		es.each(function(item) {
			this.fireEvent(item[0], item[1], item[2]);
		}, this);
	}
});


var Moosweeper = new Class({
	Implements: [Options, FireLater],
	
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
		onNewgame: $empty,
		onWin: $empty,
		onLose: function(reason) {
			if(reason == 'time') alert('Time\'s up!');
		},
		onMinimumtime: function(time) {
			alert('New minimum time: '+time+' seconds');
		},
		
		// model
		preset: 'medium',
		/* => rows: 16,
		      cols: 16,
		      minesContingent: 0.16, */
		countdown: 0,
		minimumTime: true,
		
		// view
		caption: 'Moosweeper',
		where: 'bottom',
		css: 'Moo',
		symbols: {
			covered: '?',
			marked:  '!',
			mine:    '•'
		},
		gameOptions: {
			where: 'bottom',
			interface: '<div class="third first">%minesLeft%</div>'+
			           '<div class="third second">%smiley%</div>'+
			           '<div class="third last">%countdown%</div>',
			smiley: {
				running: ':-)',
				lost:    'X-(',
				won:     ':-D',
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
		
		// add references to the whole class to model and view
		[this.model, this.view].each(function(item) {
			item.that = this;
		}, this);
		
		this.view.initialize();
		this.model.initialize();
		this.view.inject(target);
		
		this.addEvents({
			newgameinternal: function() {
				this.fireEvent('newgame');
			},
			wininternal: function(time) {
				this.fireEvent('win', time);
			},
			loseinternal: function(reason) {
				this.fireEvent('lose', reason);
			},
			minimumtimeinternal: function(time) {
				this.fireEvent('minimumtime', time);
			}
		});
		
		this.fireEvent('newgameinternal');
	},
	newGame: function() {
		if(!this.model.finished) {
			this.fireEvent('finish');
		}
		
		this.view.newGame();
		this.model.newGame();
		
		this.fireEvent('newgameinternal');
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
		
		time: 0,
		interval: null,
		
		initialize: function() {
			this.calculateCells();
			this.createField();
			this.distributeMines();
			this.startTimer();
			this.initializeTimer();
		},
		newGame: function() {
			this.finished = false;
			this.calculateCells();
			this.createField();
			this.distributeMines();
			this.startTimer();
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
		initializeTimer: function() {
			this.that.addEvent('finishinternal', function() {
				$clear(this.interval);
			}.bind(this));
			
			if(this.that.options.minimumTime) {
				this.that.addEvent('wininternal', function() {
					// minimum time
					var cookie = this.getMinimumTime();
					if(cookie) {
						cookie = cookie.toInt();
					}
					if(!$chk(cookie) || cookie > this.time) {
						Cookie.write('moosweeperminimumtime', this.time);
						this.that.fireEvent('minimumtimeinternal', this.time);
					}
				}.bind(this));
			}
		},
		startTimer: function() {
			this.time = 0;
			this.that.fireEvent('secondinternal');
			
			var increaseTimer = function() {
				this.time++;
				this.that.fireEvent('secondinternal');
				if(this.that.options.countdown > 0 && this.time == this.that.options.countdown) {
					this.that.fireEvent('finishinternal');
					this.that.fireEvent('loseinternal', 'time');
				}
			};
			this.interval = increaseTimer.periodical(1000, this);
		},
		getMinimumTime: function() {
			return Cookie.read('moosweeperminimumtime');
		},
		get: function(x, y) {
			if($defined(this.field[x][y])) {
				var minesCount = this.field[x][y];
				if(!this.finished) {
					// fire events
					if(minesCount == -1) {
						this.finished = true;
						this.that.fireLater('finishinternal');
						this.that.fireLater('loseinternal', 'mine');
					} else {
						this.cellsLeft--;
						this.that.fireEvent('discovercellinternal');
						if(this.cellsLeft <= 0) {
							this.finished = true;
							this.that.fireLater('finishinternal');
							this.that.fireLater('wininternal', this.time);
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
		}
	},
	view: {
		// elements
		cssEl: null,
		table: null,
		tbody: null,
		target: null, // where to insert the table
		divs: [],
		gameOptionsEl: null, // table > tfoot|thead
		gameOptionsEls: $H(),
		marked: 0, // how many mines are marked
		
		initialize: function() {
			this.setCSS();
			this.createField();
			this.makeGameOptions();
		},
		inject: function(target) {
			this.target = document.id(target);
			this.table.inject(this.target, this.that.options.where);
		},
		newGame: function() {
			this.marked = 0;
			this.that.fireEvent('markchangeinternal');
			
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
			if(this.cssEl) {
				this.cssEl.dispose();
			}
			
			if(this.that.options.css) {
				var isInline = this.that.options.css.test('{');
				if(isInline) {
					// inline styles
					if(Browser.Engine.trident) {
						// http://msdn.microsoft.com/en-us/library/ms533897%28VS.85%29.aspx => How to inject NoScope elements into a page with innerHTML
						this.cssEl = new Element('div', {
							html: '<div>&nsbp;</div><style type="text/css">'+this.that.options.css+'</style>'
						});
					} else {
						this.cssEl = new Element('style', {
							type: 'text/css',
							text: this.that.options.css
						});
					}
				} else {
					// external stylesheet
					if(this.that.options.css.test(/\.css$/i)) {
						var cssPath = this.that.options.css;
					}
					else {
						var cssPath = jsDir+'Styles/'+this.that.options.css+'.css';
					}
					this.cssEl = new Element('link', {
						rel: 'stylesheet',
						type: 'text/css',
						media: 'screen',
						href: cssPath
					});
				}
				this.cssEl.inject(document.head);
			}
		},
		createField: function() {
			// table
			this.table = new Element('table', {
				'class': 'moosweeper running',
				summary: 'Minesweeper field'
			});
			
			// classes
			this.that.addEvents({
				newgameinternal: function() {
					this.table.removeClass('won').removeClass('lost').removeClass('finished').addClass('running');
				}.bind(this),
				finishinternal: function() {
					this.showMines();
					this.table.removeClass('running').addClass('finished');
				}.bind(this),
				wininternal: function() {
					this.table.addClass('won');
				}.bind(this),
				loseinternal: function() {
					this.table.addClass('lost');
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
				this.that.fireEvent('markchangeinternal');
			}
		},
		show: function(div, options) {
			options = $merge({
				force: false, // discover even cells which are marked
				removeMark: false,
				autoDiscover: true // discover all the neighbor cells if there are no mines around
			}, options);
			
			// if options.force is true, discover the cell even if it's marked
			if(div.hasClass('covered') && (options.force || !div.hasClass('marked'))) {
				
				// removeMark
				if(options.removeMark) {
					if(div.hasClass('marked')) {
						div.removeClass('marked');
						this.marked--;
						this.that.fireEvent('markchangeinternal');
					}
				}
				
				// get minesCount with coordinates
				var x = div.retrieve('x');
				var y = div.retrieve('y');
				var minesCount = this.that.model.get(x, y);
				
				div.removeClass('covered').addClass('discovered');
				
				if(minesCount == -1) {
					// wham!
					div.set('text', this.that.options.symbols.mine);
					div.addClass('mine');
					this.that.fireNow();
				} else {
					// you're lucky, no mine
					div.set('text', minesCount);
					div.addClass('minescount'+minesCount);
					this.that.fireNow();
					
					// <autoDiscover>
					if(options.autoDiscover && minesCount == 0) {
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
					// </autoDiscover>
				}
				
			}
		},
		showAll: function() {
			this.divs.each(function(item) {
				item.each(function(item) {
					if(item.hasClass('covered')) {
						this.show(item, {
							force: true,
							autoDiscover: false
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
					newgameinternal: setSmiley.pass('running'),
					wininternal: setSmiley.pass('won'),
					loseinternal: setSmiley.pass('lost')
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
					wininternal: setStatus.pass(this.that.options.gameOptions.status.win, this),
					loseinternal: setStatus.pass(this.that.options.gameOptions.status.lose, this),
					newgameinternal: setStatus.pass(this.that.options.gameOptions.status.running, this)
				});
			},
			time: function() {
				this.setGameOption('time', this.that.model.time);
				this.that.addEvent('secondinternal', function() {
					this.setGameOption('time', this.that.model.time);
				}.bind(this));
			},
			countdown: function() {
				// if no countdown use time
				if(this.that.options.countdown > 0) {
					this.that.addEvent('secondinternal', function() {
						this.setGameOption('countdown', this.that.options.countdown - this.that.model.time);
					}.bind(this));
				} else {
					this.setGameOption('countdown', this.that.model.time);
					this.that.addEvent('secondinternal', function() {
						this.setGameOption('countdown', this.that.model.time);
					}.bind(this));
				}
			},
			minimumTime: function() {
				var minimumTime = this.that.model.getMinimumTime();
				if(!$chk(minimumTime) || !this.that.options.minimumTime) {
					minimumTime = 'n/a';
				}
				this.setGameOption('minimumTime', minimumTime);
				this.that.addEvent('minimumtimeinternal', function(time) {
					this.setGameOption('minimumTime', time);
				}.bind(this));
			},
			cells: function() {
				this.that.addEvent('newgameinternal', function() {
					this.setGameOption('cells', this.that.model.cells);
				}.bind(this));
			},
			mines: function() {
				this.that.addEvent('newgameinternal', function() {
					this.setGameOption('mines', this.that.model.mines);
				}.bind(this));
			},
			cellsLeft: function() {
				var setCellsLeft = function() {
					this.setGameOption('cellsLeft', this.that.model.cellsLeft);
				}.bind(this);
				
				this.that.addEvents({
					discovercellinternal: setCellsLeft,
					newgameinternal: setCellsLeft
				});
			},
			minesLeft: function() {
				var setMinesLeft = function() {
					this.setGameOption('minesLeft', this.that.model.mines - this.marked);
				}.bind(this);
				
				this.that.addEvents({
					markchangeinternal: setMinesLeft,
					newgameinternal: setMinesLeft,
					wininternal: function() {
						this.view.marked = this.model.mines;
						setMinesLeft();
					}
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