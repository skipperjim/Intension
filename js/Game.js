var TopDownGame = TopDownGame || {};

//title screen
TopDownGame.Game = function(){};

TopDownGame.Game.prototype = {
    create: function() {
        // Define variables and constants
        this.stoneQty = 0;
        this.throwDelay = 200;
        this.THROW_OBJECT_SPEED = 400;
        this.nextThrowAt = 0;
        this.aimDirection;
        this.health = 100;
        
        this.map = this.game.add.tilemap('level1');
        //the first parameter is the tileset name as specified in Tiled, the second is the key to the asset
        this.map.addTilesetImage('tiles', 'gameTiles');

        //create layer
        this.backgroundlayer = this.map.createLayer('backgroundLayer');
        this.floraLayer = this.map.createLayer('floraLayer');
        this.blockedLayer = this.map.createLayer('blockedLayer');
        this.upperLayer = this.map.createLayer('upperLayer');

        //collision on blockedLayer
        this.map.setCollisionBetween(1, 2000, true, 'blockedLayer');

        //resizes the game world to match the layer dimensions
        this.backgroundlayer.resizeWorld();
        this.createItems();
        this.createDoors();    

        //create player
        var result = this.findObjectsByType('playerStart', this.map, 'objectsLayer')
        this.player = this.game.add.sprite(result[0].x, result[0].y, 'player');
        // add animations to player
        
        // Add physics
        this.game.physics.arcade.enable(this.player);

        // Set pivot points
        this.player.anchor.setTo(0.5, 0.5);
        
        //the camera will follow the player in the world
        this.game.camera.follow(this.player);
        //move player with cursor keys
        this.cursors = this.game.input.keyboard.createCursorKeys();
        
        // Create an object pool of stones
        this.stonePool = this.game.add.group();
        for(var i = 0; i < 1; i++){
            // Create each stone and add it to the group
            var stone = this.game.add.sprite(0, 0, 'stone');
            this.stonePool.add(stone);
            stone.anchor.setTo(0.5, 0.5);
            this.game.physics.enable(stone, Phaser.Physics.ARCADE);
            // Set its initial state to "dead"
            stone.kill();
        }
        
        // Instruction Text
        this.instructions = this.add.text(115, 97, 'Use WASD or Arrows to move. \nLeft-click to attack.', {font: '8px monospace', fill: '#fff', align: 'center' });
        this.instructions.anchor.setTo(0.5, 0.5);
        this.instructionsExpire = this.time.now + 5000;
        // Stat text
        this.statText = this.add.text(25, 25, 'Health: '+this.health+'\nStones: '+this.stoneQty+'\n', {font: '8px monospace', fill: '#fff', align: 'left'});
        this.statText.anchor.setTo(0.5, 0.5);
    },
    render: function(){
        //this.game.debug.body(this.player);
        //this.game.debug.body(this.stone);
    },
    createItems: function() {
        //create items
        this.items = this.game.add.group();
        this.items.enableBody = true;
        var item;    
        result = this.findObjectsByType('item', this.map, 'objectsLayer');
        
        result.forEach(function(element){
            console.log("creating object");
            this.createFromTiledObject(element, this.items);
        }, this);
    },
    createDoors: function() {
        //create doors
        this.doors = this.game.add.group();
        this.doors.enableBody = true;
        result = this.findObjectsByType('door', this.map, 'objectsLayer');

        result.forEach(function(element){
            this.createFromTiledObject(element, this.doors);
        }, this);
    },
    //find objects in a Tiled layer that containt a property called "type" equal to a certain value
    findObjectsByType: function(type, map, layer) {
        var result = new Array();
        map.objects[layer].forEach(function(element){
            if(element.properties.type === type) {
                //Phaser uses top left, Tiled bottom left so we have to adjust
                //also keep in mind that the cup images are a bit smaller than the tile which is 16x16
                //so they might not be placed in the exact position as in Tiled
                element.y -= map.tileHeight;
                result.push(element);
            }      
        });
        return result;
    },
    //create a sprite from an object
    createFromTiledObject: function(element, group) {
        var sprite = group.create(element.x, element.y, element.properties.sprite);

        //copy all properties to the sprite
        Object.keys(element.properties).forEach(function(key){
            sprite[key] = element.properties[key];
        });
    },
    collect: function(player, collectable) {
        collectable.name = collectable.sprite;
        console.log(collectable.name+" picked up");
        //remove sprite
        collectable.destroy();
        // Do stuff with the item
        if(collectable.name === "smallstones"){
            this.stoneQty = this.stoneQty+3;
            this.updateStatText();
        }
    },
    enterDoor: function(player, door) {
        console.log('entering door that will take you to '+door.targetTilemap+' on x:'+door.targetX+' and y:'+door.targetY);
    },
    updateStatText: function(){
        this.statText.setText('Health: '+this.health+'\nStones: '+this.stoneQty+'\n');
    },
    throw: function(){
        if(this.nextThrowAt > this.time.now){
            return;
        }
        // If player is out of ammo
        if(this.stoneQty === 0){
            console.log("No more stones. Collect some.");
            return;
        }
        this.nextThrowAt = this.time.now + this.throwDelay;
        // Get a dead stone from the pool
        var stone = this.stonePool.getFirstDead();
        // If no stones available, don't throw
        if(stone === null || stone === undefined) return;

        // Revive the bullet and make it "alive"
        stone.revive();
        // Kill stone when they leave world
        stone.checkWorldBounds = true;
        stone.outOfBoundsKill = true;
        // Set the stone position to the player position
        stone.reset(this.player.x, this.player.y);
        stone.rotation = this.player.rotation;
        // Throw it in the right direction
        stone.body.velocity.x = Math.cos(this.player.aimDirection) * this.THROW_OBJECT_SPEED;
        stone.body.velocity.y = Math.sin(this.player.aimDirection) * this.THROW_OBJECT_SPEED; 
        this.stoneQty--;
        this.updateStatText();
    },
    update: function() {
        //collision
        this.game.physics.arcade.collide(this.player, this.blockedLayer);
        this.game.physics.arcade.overlap(this.player, this.items, this.collect, null, this);
        this.game.physics.arcade.overlap(this.player, this.doors, this.enterDoor, null, this);
        this.game.physics.arcade.overlap(this.stonePool, this.enemy, this.enemyHit, null, this);

        //player movement
        this.player.body.velocity.y = 0;
        this.player.body.velocity.x = 0;

        if(this.cursors.up.isDown || this.input.keyboard.isDown(Phaser.Keyboard.W)) {
          this.player.body.velocity.y -= 50;
        }
        else if(this.cursors.down.isDown || this.input.keyboard.isDown(Phaser.Keyboard.S)) {
          this.player.body.velocity.y += 50;
        }
        if(this.cursors.left.isDown || this.input.keyboard.isDown(Phaser.Keyboard.A)) {
            this.player.scale.x = -1;
            this.player.body.velocity.x -= 50;
        }
        else if(this.cursors.right.isDown || this.input.keyboard.isDown(Phaser.Keyboard.D)) {
            this.player.scale.x = 1;
            this.player.body.velocity.x += 50;
        }
        
        // Aiming
        this.player.aimDirection = this.game.physics.arcade.angleToPointer(this.player);
        
        // Throw or attack
        if(this.input.activePointer.isDown){
            this.throw();
        }
        
        if(this.instructions.exists && this.time.now > this.instructionsExpire){
            this.instructions.destroy();
        }
        
        
        
        // Rotate the player facing the mouse
        //this.player.rotation = this.game.physics.arcade.angleToPointer(this.player);
    }
};