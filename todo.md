# todo

- [x] /roll
- [x] create a character and store them in a DB
- [x] add commands to get and set fatigue
- [x] when rolling a dice, use player character's fatigue by default, and deal fatigue damage
- [x] add autocomplete for characters to character commands
- [x] /characters view [name]
- [x] /characters assign [name] [player]
- [x] track currency
- [x] generate NPC names

- combat
	- /combat start
		- [x] shows a select menu to choose combat participants
		- [ ] add select menu to choose initiative attribute, mobility by default
		- [x] shows a button to confirm and start combat
		- [ ] disable the start button if participants < 2
		- [ ] start button should roll initiative for each player and create the combat object
		- [ ] cancel button
		- [ ] pagination
	- /combat end
		- [ ] ends combat
	- /combat show/info/current/whatever
		- [ ] if combat is not running, show a message saying so
		- if combat is running
			- [ ] show the current round, list of characters with initiative, and the current character's turn
			- [ ] advance button
			- [ ] rewind button
	- [ ] /combat add/remove [character]

- [ ] items
- [ ] /heal [amount?] - heal health
- [ ] /rest [hours?] - heal fatigue
- [ ] /milestone - leveling up
- [ ] buttons to reroll with daunting/eased/normal
- [ ] button to reroll with different attribute
- [ ] button to reroll with different difficulty
