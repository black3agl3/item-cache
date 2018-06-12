const {protocol} = require('tera-data-parser')

module.exports = function ItemCache(dispatch) {
	let gameId = null,
		lock = false,
		inven = null,
		invenNew = null,
		ware = {}

	dispatch.hook('S_LOGIN', 10, event => {
		({gameId} = event)
		inven = invenNew = null
		delete ware[9] // Pet bank
	})

	dispatch.hook('S_INVEN', 'raw', {order: 100, filter: {fake: null}}, (code, data) => {
		if(lock) return

		if(data[25]) invenNew = [] // Check first flag

		invenNew.push(data = Buffer.from(data))

		data[24] = 1 // Set open flag

		if(!data[26]) { // Check more flag
			inven = invenNew
			invenNew = null
		}
	})

	dispatch.hook('C_SHOW_INVEN', 1, {order: 100, filter: {fake: null}}, event => {
		if(event.unk !== 1) return // Type?

		lock = true
		for(let data of inven) dispatch.toClient(data)
		return lock = false
	})

	dispatch.hook('S_VIEW_WARE_EX', 1, {order: 100, filter: {fake: null}}, event => {
		if(lock || ![1, 9, 12].includes(event.type) || event.action) return

		if(!ware[event.type]) ware[event.type] = {}
		else
			for(let page of Object.values(ware[event.type])) // Update global information for each page
				Object.assign(page, {
					lastUsedSlot: event.lastUsedSlot,
					slotsUsed: event.slotsUsed,
					gold: event.gold,
					slots: event.slots
				})

		ware[event.type][event.offset] = event
	})

	dispatch.hook('C_VIEW_WARE', 2, {order: 100, filter: {fake: null}}, event => {
		if(!event.gameId.equals(gameId)) return

		if(ware[event.type] && ware[event.type][event.offset]) {
			lock = true
			dispatch.toClient('S_VIEW_WARE_EX', 1, ware[event.type][event.offset])
			return lock = false
		}
	})
}