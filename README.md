MooSweeper
==========

Costumizable Minesweeper clone.

![Screenshot](http://projects.timbaumann.info/MooSweeper/Demo/screenshot1.png)

How to use
----------

### Syntax

	#JS
	var mooSweeper = new MooSweeper(target[, options]);

### Arguments

1. target - (*mixed*) The element or the string id of the element the MooSweeper will be injected in.
2. options - (*object*, optional) The options object described below:

### Options

* where - (*string*) where to inject the MooSweeper (like (Element.inject)[http://mootools.net/docs/core/Element/Element#Element:inject]). Defaults to *'bottom'*.
* preset - (*string*) One of the presets *easy*, *medium* (the default) or *hard*.
* rows - (*number*) This property will overwrite the preset.
* cols - (*number*) This property will overwrite the preset.
* minesContingent - (*number*) Must be between 0 and 1. Overwrites the preset. If you have a 10×10 field and a minesContingent of 0.13, there are 13 mines.
* caption - (*string*) Pass an empty string if you don't want a caption. Defaults to 'MooSweeper'.
* countdown - (*number*) Pass the number of seconds the user to finish the game. If *0* (the default), there will be no maximum time.
* minimumTime - (*bool*) Whether to save the minimum time locally in a cookie and fire minimumtime events. Defaults to *true*.
* css - (*string*) Can be CSS, the path to a CSS file or the name of a provided style. Defaults to *'Moo'*.
* symbols - (*object*) - The labels of cells in a specific state.
  * covered - (*string*) The label of a covered cell. Defaults to *'?'*.
  * marked - (*string*) The label of a marked cell. Defaults to *'!'*.
  * mine - (*string*) The label of a mine. Defaults to *'&middot;'* (entity of •).
* gameOptions - (*object*) Options of the bar with displays and buttons.
  * interface - (*string*) A string containing the names of game options in percent signs. Can contain html, too. Defaults to *'&lt;div class="third first"&gt;%minesLeft%&lt;/div&gt;&lt;div class="third second"&gt;%smiley%&lt;/div&gt;&lt;div class="third last"&gt;%countdown%&lt;/div&gt;'*, which makes the first game option left-aligned, the second centered and the third right-aligned.
  * where - (*string*) Can be *'top'* (the default) or *'bottom'*
  * smiley - (*object*) The labels of the smiley button in different states.
    * running - (*string*) Defaults to *':-)'*.
    * won - (*string*) Defaults to *':-D'*.
    * lost - (*string*) Defaults to *'X-('*.
    * unsure - (*string*) When the user is clicking on a cell. Defaults to *':-O'*.
  * status - (*object*) The labels of the status display.
    * running - (*string*) Defaults to *'Running'*.
    * won - (*string*) Defaults to *'Won!'*.
    * lost - (*string*) Defaults to *'Lost!'*.
  * newGame - (*string*) The title of the button. Defaults to *'New Game'*.

### Game options

Buttons:

* newGame - A button to start a new game
* smiley - The smiley in the Windows minesweeper. You can click on it to start a new game.

Displays:

* status - Status text (e.g. "running").
* cells - The number of cells.
* mines - The number of mines on the field.
* cellsLeft - How many cells you have to click on in order to clear the field. Updates.
* minesLeft = Number of mines - number of marked cells.
* time - number of seconds
* countdown - Displays the number of seconds you have left.
* minimumTime - Displays the personal minimum time.

### Events

* onWin - (*function*) The function to execute when the user has won. Passed the *number* of seconds he it has taken to clear the field.
* onLose - (*function*) The function to execute when the user has lost. Passed the reason (a *string*, 'mine' or 'time'). Defaults to *function(reason) { if(reason == 'time') alert('Time\'s up!'); }*.
* onMinimumtime - (*function*) The function to execute when the user has archived a new minimum time. Passed the *number* of seconds. Defaults to *function(time) { alert('New minimum time: '+time+' seconds'); }*.
* onNewgame - (*function*) The function to execute when a new game is started.

### Methods

* setCSS(css) - if you want to change the css during the game (have a look at the demo!)
* newGame() - starts a new game 
* showMines() - will show all mines and, if game wasn't finished, fires the lose event
* showAll() - shows all cells and, if game wasn't finished, fires the lose event

### Presets

* easy - *{ rows: 8, cols: 8, minesContingent: 0.16 }* (64 cells, 10 mines)
* medium - *{ rows: 16, cols: 16, minesContingent: 0.16 }* (256 cells, 41 mines)
* hard - *{ rows: 16, cols: 30, minesContingent: 0.21 }* (480 cells, 101 mines)

### Provided styles

* Moo - Based on the style of the MooTools website
* Dread - A dark, military style

### Styling

Have a look at the DOM and the provided CSS files if you want to create your own style.

### Example

	#JS
	var mooSweeper = new MooSweeper(document.body, {
	    onLose: function() {
	        this.newGame(); // Automatically start new game
	    },
	    where: 'top', // inject the element at the top
	    caption: 'Minesweeper clone',
	    css: 'Dread', // military style
	    gameOptions: {
	        interface: '&lt;center&gt;%newGame%&lt;/center&gt;' // only a button to start a new game
	    }
	});

Have a look at the source code of the demo, too.

Screenshots
-----------

![Screenshot 1](http://projects.timbaumann.info/MooSweeper/Demo/screenshot1.png)
![Screenshot 2](http://projects.timbaumann.info/MooSweeper/Demo/screenshot2.png)