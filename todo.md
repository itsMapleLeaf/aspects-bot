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
		- [x] add select menu to choose initiative attribute, mobility by default
		- [x] shows a button to confirm and start combat
		- [x] require at least 2 participants
		- [x] start button should roll initiative for each player and create the combat object
		- [ ] pagination
	- /combat end
		- [x] deletes the combat object
	- /combat show/info/current/whatever
		- [x] if combat is not running, show a message saying so
		- if combat is running
			- [x] show the current round, list of characters with initiative, and the current character's turn
			- [x] advance button
			- [x] rewind button
			- [x] end combat button
	- [ ] /combat add/remove [character]

- [ ] items
- [ ] /heal [amount?] - heal health
- [ ] /rest [hours?] - heal fatigue
- [ ] /milestone - leveling up
- [ ] buttons to reroll with daunting/eased/normal
- [ ] button to reroll with different attribute
- [ ] button to reroll with different difficulty
