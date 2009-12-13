MooSweeper
==========

Costumizable Minesweeper clone.

![Screenshot](http://projects.timbaumann.info/MooSweeper/Demo/screenshot.png)

How to use
----------

	#JS
	var mooSweeper = new MooSweeper(document.body, {
		cols: 10,
		rows: 10,
		where: 'bottom' // where the minesweeper is inserted
	});

To do
-----

* Alternative style
* Code cleanup, performance improvements
* Game Options (restart button, timer, mines left)
* Highscore (local with cookies)
* IE