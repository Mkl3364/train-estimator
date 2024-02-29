import { ApiException, DiscountCard, InvalidTripInputException, Passenger, TrainDetails, TripRequest } from "./model/trip.request";

const YOUNG_PASSENGER_PRICE = 9;
const EMPOYEES_PRICE = 1;
const API_BASE_URL= 'https://sncftrenitaliadb.com/api/train/estimate/price';

interface urlParams {
    from: string,
    to: string,
    when: Date
}

class TrainTicketAPI {

    private readonly baseurl: string;

    constructor(baseurl: string) {
        this.baseurl = baseurl;
    }

    constructParams({from, to, when }: urlParams): string {
        return `?from=${from}&to=${to}&date=${when}`;
    }

    constructHeaders(header?: Record<string, string>): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            ...header
        };
    }

    private url(params: urlParams): string {
        return API_BASE_URL + this.constructParams(params);
    }

    async getRequest(params: urlParams, header?: Record<string, string>) {
        const request = await fetch(this.url(params), this.constructHeaders(header));
        const response = await request.json();
        return response
    }
}
export class TrainTicketEstimator extends TrainTicketAPI {

    constructor() {
        super(API_BASE_URL);
    }

    getAvailableSeats(trainDetails: TrainDetails): number {
        if (trainDetails.isFull) {
            throw new InvalidTripInputException("Train is full");
        }
        return trainDetails.seats.filter((seat) => seat.isAvailable).length;
    }

    async estimate(trainDetails: TripRequest): Promise<number> {
        const { details, passengers } = trainDetails;

        if (!passengers.length) return 0

        const { from, to, when } = details;

        if (!from.trim().length) throw new InvalidTripInputException("Start city is invalid")

        if (!to.trim().length) throw new InvalidTripInputException("Destination city is invalid");


        if (when < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0)) {
            throw new InvalidTripInputException("Date is invalid");
        }

        const baseTicketPrice = await this.fetchTicketApi(trainDetails);

        const totalbaseTicketPrice = this.calculateTotalPrice(baseTicketPrice, trainDetails);

        return totalbaseTicketPrice;
    }

    private async fetchTicketApi(trainDetails: Pick<TripRequest, 'details'>): Promise<number> {
        const { from, to, when } = trainDetails.details

        try {
            const response = await this.getRequest({ from, to, when });
            return response.price;
        } catch (error) {
            throw new ApiException();
        }


    }

    calculatebaseTicketPrice(passenger: Passenger, baseTicketPrice: number, trainDetails: TripRequest) {
        let calculatedTicketPrice = baseTicketPrice;
        const { age, discounts } = passenger;

        if (age < 0 || age < 1) {
            throw new InvalidTripInputException("Age is invalid");
        }
        
        if (discounts.includes(DiscountCard.Family)) {
            calculatedTicketPrice = this.calculateFamilyDiscount(baseTicketPrice, calculatedTicketPrice, trainDetails);
            return calculatedTicketPrice;
        }

        calculatedTicketPrice = this.calculateTicketDependingAge(passenger, baseTicketPrice);

        const passengerCount = trainDetails.passengers.length;

        if (passengerCount === 2) {
            calculatedTicketPrice = this.calculateCoupleDiscount(trainDetails, baseTicketPrice);
        } 
        else if (passengerCount === 1) {
            calculatedTicketPrice = this.calculateHalfCoupleDiscount(trainDetails, calculatedTicketPrice, baseTicketPrice);
        }

        calculatedTicketPrice = this.calculateDaysDifference(trainDetails, calculatedTicketPrice, baseTicketPrice);

        if (passenger.age > 0 && passenger.age < 4) {
            return YOUNG_PASSENGER_PRICE;
        }

        if (passenger.discounts.includes(DiscountCard.TrainStroke)) {
            return EMPOYEES_PRICE;
        }

        return calculatedTicketPrice;
    }

    private calculateTicketDependingAge(passenger: Passenger, baseTicketPrice: number) {
        if (passenger.age <= 17) {
            return this.calculateMinorDiscount(baseTicketPrice);
        } else if (passenger.age >= 70) {
            return this.calculateSeniorDiscount(baseTicketPrice, passenger);
        } else {
            return baseTicketPrice * 1.2;
        }
        return baseTicketPrice;
    }

    private calculateFamilyDiscount(baseTicketPrice: number, calculatedTicketPrice: number, trainDetails: TripRequest) {
        const { passengers } = trainDetails;
        const lastNameSet = new Set<string>();
        let hasOtherDiscount = false;
    
        for (const passenger of passengers) {
            if (passenger.lastName) {
                if (lastNameSet.has(passenger.lastName)) {
                    if (passenger.discounts.length > 1) {
                        hasOtherDiscount = true;
                        break;
                    }
    
                    calculatedTicketPrice -= baseTicketPrice * 0.3;
                    return calculatedTicketPrice;
                }
                lastNameSet.add(passenger.lastName);
            }
        }
    
        if (hasOtherDiscount) {
            return calculatedTicketPrice;
        }
    
        return calculatedTicketPrice;
        
        
    }

    private calculateDaysDifference(trainDetails: TripRequest, calculatedTicketPrice: number, baseTicketPrice: number) {
        const { when } = trainDetails.details;
        const currentDate = new Date();
        const tripStartDate = when;
        const daysDifference = this.calculateDifferenceInDays(tripStartDate, currentDate);
        const sixHoursBeforeDeparture = new Date(tripStartDate.getTime() - 6 * 60 * 60 * 1000);

        if (daysDifference >= 30) {
            calculatedTicketPrice -= baseTicketPrice * 0.2;
        }
        else if (daysDifference > 5) {
            calculatedTicketPrice += (20 - daysDifference) * 0.02 * baseTicketPrice;
        }
        else if (daysDifference < 1) {
            if (this.getAvailableSeats(trainDetails.trainDetails) !== 0) {
                if (tripStartDate.getTime() > sixHoursBeforeDeparture.getTime()) {
                    calculatedTicketPrice -= baseTicketPrice * 0.2;
                }
            }
        }
        else {
            calculatedTicketPrice += baseTicketPrice;
        }
        return calculatedTicketPrice;
    }

    private calculateDifferenceInDays(tripStartDate: Date, currentDate: Date) {
        return Math.ceil((tripStartDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
    }

    private calculateHalfCoupleDiscount(trainDetails: TripRequest, calculatedTicketPrice: number, baseTicketPrice: number) {
        let halfCouple = false;
        let minor = false;
        for (let i = 0; i < trainDetails.passengers.length; i++) {
            if (trainDetails.passengers[i].discounts.includes(DiscountCard.HalfCouple)) {
                halfCouple = true;
            }
            if (trainDetails.passengers[i].age < 18) {
                minor = true;
            }
        }
        if (halfCouple && !minor) {
            calculatedTicketPrice -= baseTicketPrice * 0.1;
        }
        return calculatedTicketPrice;
    }

    private calculateCoupleDiscount(trainDetails: TripRequest, baseTicketPrice: number) {
        let couple = false;
        let minor = false;
        for (let i = 0; i < trainDetails.passengers.length; i++) {
            if (trainDetails.passengers[i].discounts.includes(DiscountCard.Couple)) {
                couple = true;
            }
            if (trainDetails.passengers[i].age < 18) {
                minor = true;
            }
        }
        if (couple && !minor) {
            baseTicketPrice - baseTicketPrice * 0.2;
        }
        return baseTicketPrice;
    }

    private calculateSeniorDiscount(baseTicketPrice: number, passenger: Passenger) {
        const calculatedTicketPrice = baseTicketPrice * 0.8;
        if (passenger.discounts.includes(DiscountCard.Senior)) {
            return (baseTicketPrice * 0.8) - (baseTicketPrice * 0.2);
        }
        return calculatedTicketPrice;
    }

    private calculateMinorDiscount(baseTicketPrice: number) {
        return baseTicketPrice * 0.6;
    }

    calculateTotalPrice(baseTicketPrice: number, trainDetails: TripRequest) {
        const { passengers } = trainDetails;

        return passengers.reduce((total, passenger) => {
            const unitPriceTicket = this.calculatebaseTicketPrice(passenger, baseTicketPrice, trainDetails);

            return total + unitPriceTicket;
        }, 0)
    }
}
