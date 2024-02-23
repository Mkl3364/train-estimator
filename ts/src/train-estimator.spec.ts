import { InvalidTripInputException, TripRequest } from "./model/trip.request";
import { TrainTicketEstimator } from "./train-estimator";

describe("train estimator", function () {
    it("should work", () => {
        expect(1 + 2).toBe(3);
    });
});


describe('create an object from TrainEstimator class', () => {

})

describe('TrainTicketEstimator', () => {
    let estimator: TrainTicketEstimator;

    beforeEach(() => {
        estimator = new TrainTicketEstimator();
    });

    it('estimate returns 0 when no passengers', async () => {
        const tripDetails: TripRequest = {
            passengers: [],
            details: { from: 'Paris', to: 'Lyon', when: new Date() }
        };

        const result = await estimator.estimate(tripDetails);

        expect(result).toBe(0);
    });

    it('throw error when start city is invalid', () => {
        const tripDetails: TripRequest = {
            passengers: [{ age: 25, discounts: [] }],
            details: { from: '', to: 'Lyon', when: new Date() }
        };
        expect(estimator.estimate(tripDetails)).rejects.toThrow('Start city is invalid');

    });

    
    it('estimate throws error when destination city is invalid', async () => {
        const tripDetails: TripRequest = {
            passengers: [{ age: 25, discounts: [] }],
            details: { from: 'Paris', to: '', when: new Date() } 
        };

        await expect(estimator.estimate(tripDetails)).rejects.toThrow('Destination city is invalid');
    });

});