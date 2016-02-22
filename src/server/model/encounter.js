import mongoose, {Schema} from 'mongoose';

let EncounterSchema = new Schema({
	date: {type: Date, required: true},
	length: Number,
	ping: {type: Date, required: true},
	participants: [{
		userId: {type: String, required: true, index: true},
		review: Object,
		_id: false,
	}],
	result: String,
});

let Encounter = mongoose.model('Encounter', EncounterSchema);
export {Encounter};
