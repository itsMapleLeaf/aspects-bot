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

- [ ] /(health/fatigue/notes) add [amount] [character|"Everyone"]?

  - when choosing "Everyone", if GM, show a followup message with a multi-select for characters to apply
  - if character is not specified, use the player character, or show the select menu if GM

- make /roll more useful

  - [ ] alongside the `d*` options, show attributes and aspects
    - when an attribute/aspect is selected, used the character argument if specified, or the player's character otherwise
  - [ ] remove /action

- [ ] list most recently used characters first
- [ ] character privacy
- [ ] buttons to reroll with daunting/eased/normal
- [ ] button to reroll with different attribute
- [ ] button to reroll with different difficulty
- [ ] items
- [ ] /milestone - leveling up

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

## other notes

- the combat tracker being used in the same place as all of the dice rolls is _very_ inconvenient

- renari abilities are underpowered and/or situational

  - idea: something something pet or hug to reduce fatigue?

- make a more deterministic way of setting aspect skill rolls

  - idea: always start at a 1d8, downgrade for every advantage, upgrade for every disadvantage
    - redge had dense fog as an advantage, but glowy crystals and skylight as a disadvantage, so maybe their rolls should've been 1d6
    - kohaku kind of the same, thonk
    - or we say fuck it and just follow the location tags lol
      - but the crystals fucked things up, that's situational. I guess it would've just removed "dim light"
        - what if the crystals did something interesting? other than what I just described
