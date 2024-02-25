import { ApiException, DiscountCard, TripRequest } from "./model/trip.request";
import { TrainTicketEstimator } from "./train-estimator";



describe("train estimator", function () {

    it("should work", () => {
        expect(1 + 2).toBe(3);
    });


});

describe('TrainTicketEstimator', () => {

    const PRICE = 100;
    const THIRTY_DAYS_DISCOUNT = 0.2;
    const SEVENTY_YEARS_DISCOUNT = 0.8;
    const HEIGHTEEN_YEARS_DISCOUNT = 0.6;
    const SENIOR_DISCOUNT = 0.2;
    const FIFTY_YEARS_INCREASE = 1.2;

    global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ price: PRICE }),
    })

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


    it('estimate throws error when date is invalid', async () => {
        const invalidDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0);
        invalidDate.setDate(invalidDate.getDate() - 1);

        const tripDetails: TripRequest = {
            passengers: [{ age: 25, discounts: [] }],
            details: { from: 'Paris', to: 'Lyon', when: invalidDate }
        };

        await expect(estimator.estimate(tripDetails)).rejects.toThrow('Date is invalid');
    });

    it('estimate throws ApiException() when API call fails', async () => {
        const fetchMock = jest.fn().mockRejectedValue(new ApiException());

        const trainDetails: TripRequest = {
            passengers: [{ age: 25, discounts: [] }],
            details: { from: 'Paris', to: 'Lyon', when: new Date() }
        }

        expect(async () => await fetchMock(`https://sncftrenitaliadb.com/api/train/estimate/price?from=${trainDetails.details.from}&to=${trainDetails.details.to}&date=${trainDetails.details.when}`)).rejects.toEqual(new ApiException())
    });

    it('Should throw error if passenger age is invalid', async () => {
        const tripRequest: TripRequest = {
            passengers: [{ age: -1, discounts: [] }],
            details: {
                from: 'Paris',
                to: 'Lyon',
                when: new Date()
            }
        };

        await expect(estimator.estimate(tripRequest)).rejects.toThrow("Age is invalid");
    });

    it('should apply 40% for passengers below 18 years old before 30days', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 40);
        const expectedResult = Math.round((HEIGHTEEN_YEARS_DISCOUNT - THIRTY_DAYS_DISCOUNT) * PRICE);
        const tripRequest: TripRequest = {
            passengers: [{ age: 16, discounts: [] }],
            details: {
                from: 'Paris',
                to: 'Lyon',
                when: futureDate
            }
        };
        const result = await estimator.estimate(tripRequest);

        expect(result).toBe(expectedResult);
    })

    it('should apply 20% for passengers above 70 years old before 30days', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 40);
        const expectedResult = Math.round((SEVENTY_YEARS_DISCOUNT - THIRTY_DAYS_DISCOUNT) * PRICE);
        const tripRequest: TripRequest = {
            passengers: [{ age: 71, discounts: [] }],
            details: {
                from: 'Paris',
                to: 'Lyon',
                when: futureDate
            }
        };
        const result = await estimator.estimate(tripRequest);

        expect(result).toBe(expectedResult);
    })

    it('should apply 20% for passengers above 70 years old before 30days with senior card discount', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 40);
        const priceAfterDiscount = Math.round((SEVENTY_YEARS_DISCOUNT - SENIOR_DISCOUNT - THIRTY_DAYS_DISCOUNT) * PRICE);
        const tripRequest: TripRequest = {
            passengers: [{ age: 71, discounts: [DiscountCard.Senior] }],
            details: {
                from: 'Paris',
                to: 'Lyon',
                when: futureDate
            }
        };
        const priceToPay = await estimator.estimate(tripRequest);

        expect(priceToPay).toBe(priceAfterDiscount);
    })

    it('should apply +20% for passengers between 18yo and 70 before 30days', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 40);
        const priceAfterIncrease = Math.round((FIFTY_YEARS_INCREASE - THIRTY_DAYS_DISCOUNT) * PRICE);
        const tripRequest: TripRequest = {
            passengers: [{ age: 50, discounts: [] }],
            details: {
                from: 'Paris',
                to: 'Lyon',
                when: futureDate
            }
        };
        const priceToPay = await estimator.estimate(tripRequest);

        expect(priceToPay).toBe(priceAfterIncrease);
    })

    it('Estimate for passengers with TrainStroke card should have a fixed price of 1', async () => {
        const tripRequest: TripRequest = {
            passengers: [{ age: 30, discounts: [DiscountCard.TrainStroke] }],
            details: {
                from: 'CityA',
                to: 'CityB',
                when: new Date()
            }
        };
    
        const result = await estimator.estimate(tripRequest);
    
        expect(result).toBe(1);
    });
});