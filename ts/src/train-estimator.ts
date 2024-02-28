import { ApiException, DiscountCard, InvalidTripInputException, Passenger, TrainDetails, TripRequest } from "./model/trip.request";

const YOUNG_PASSENGER_PRICE = 9;
const EMPOYEES_PRICE = 1;
export class TrainTicketEstimator {

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

        const ticketPrice = await this.fetchTicketApi(trainDetails);

        const totalTicketPrice = this.calculateTotalPrice(ticketPrice, trainDetails);

        return totalTicketPrice;
    }

    private async fetchTicketApi(trainDetails: Pick<TripRequest, 'details'>): Promise<number> {
        const url = `https://sncftrenitaliadb.com/api/train/estimate/price?from=${trainDetails.details.from}&to=${trainDetails.details.to}&date=${trainDetails.details.when}`;

        try {
            const request = await fetch(url);
            const response = await request.json();
            return response.price;
        } catch (error) {
            throw new ApiException();
        }
    }

    calculateTicketPrice(passenger: Passenger, ticketPrice: number, trainDetails: TripRequest) {
        let intermediate = ticketPrice;

        if (passenger.age < 0) {
            throw new InvalidTripInputException("Age is invalid");
        }

        if (passenger.age < 1) {
            throw new InvalidTripInputException("Age is invalid");
        }

        intermediate = this.calculateTicketDependingAge(intermediate, passenger, ticketPrice);

        if (trainDetails.passengers.length == 2) {
            intermediate = this.calculateCoupleDiscount(trainDetails, ticketPrice);
        }

        if (trainDetails.passengers.length == 1) {
            intermediate = this.calculateHalfCoupleDiscount(trainDetails, intermediate, ticketPrice);
        }


        intermediate = this.calculateDaysDifference(trainDetails, intermediate, ticketPrice);
        
        if (passenger.age > 0 && passenger.age < 4) {
            return YOUNG_PASSENGER_PRICE;
        }

        if (passenger.discounts.includes(DiscountCard.TrainStroke)) {
            return EMPOYEES_PRICE;
        }

        if (passenger.discounts.includes(DiscountCard.Family)) {
            intermediate = this.calculateFamilyDiscount(ticketPrice);
        }

        // const familyCardDiscount = this.calculateFamilyCardDiscount(trainDetails.passengers, ticketPrice);
        // if (familyCardDiscount) {
        //     intermediate = familyCardDiscount;
        // }

        return intermediate;
    }

    private calculateTicketDependingAge(intermediate: number, passenger: Passenger, ticketPrice: number) {
        if (passenger.age <= 17) {
            ticketPrice = this.calculateMinorDiscount(ticketPrice);
        } else if (passenger.age >= 70) {
            ticketPrice = this.calculateSeniorDiscount(intermediate, ticketPrice, passenger);
        } else {
            ticketPrice = ticketPrice * 1.2;
        }
        return ticketPrice;
    }

    private calculateFamilyDiscount(ticketPrice: number) {
        return ticketPrice - (ticketPrice * 0.3);
    }

    private calculateDaysDifference(trainDetails: TripRequest, intermediate: number, ticketPrice: number) {
        const currentDate = new Date();
        const tripStartDate = trainDetails.details.when;
        const daysDifference = Math.ceil((tripStartDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
        const sixHoursBeforeDeparture = new Date(tripStartDate.getTime() - 6 * 60 * 60 * 1000);

        if (daysDifference >= 30) {
            intermediate -= ticketPrice * 0.2;
        }
        else if (daysDifference > 5) {
            intermediate += (20 - daysDifference) * 0.02 * ticketPrice;
        }
        else if (daysDifference < 1) {
            if (this.getAvailableSeats(trainDetails.trainDetails) !== 0) {
                if (tripStartDate.getTime() > sixHoursBeforeDeparture.getTime()) {
                    intermediate -= ticketPrice * 0.2;
                }
            }
        }
        else {
            intermediate += ticketPrice;
        }
        return intermediate;
    }

    private calculateHalfCoupleDiscount(trainDetails: TripRequest, intermediate: number, ticketPrice: number) {
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
            intermediate -= ticketPrice * 0.1;
        }
        return intermediate;
    }

    private calculateCoupleDiscount(trainDetails: TripRequest, ticketPrice: number) {
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
            ticketPrice - ticketPrice * 0.2;
        }
        return ticketPrice;
    }

    private calculateSeniorDiscount(intermediate: number, ticketPrice: number, passenger: Passenger) {
        intermediate = ticketPrice * 0.8;
        if (passenger.discounts.includes(DiscountCard.Senior)) {
            intermediate -= ticketPrice * 0.2;
        }
        return intermediate;
    }

    private calculateMinorDiscount(ticketPrice: number) {
        return ticketPrice * 0.6;
    }

    calculateFamilyCardDiscount(passengers: Passenger[], ticketPrice: number): number | undefined {
        const lastNameSet = new Set<string>();

        for (const passenger of passengers) {
            if (passenger.lastName) {
                if (lastNameSet.has(passenger.lastName)) {
                    return ticketPrice - (ticketPrice * 0.3);
                }
                lastNameSet.add(passenger.lastName);
            }
        }
    }

    calculateTotalPrice(ticketPrice: number, trainDetails: TripRequest) {
        const { passengers } = trainDetails;

        return passengers.reduce((total, passenger) => {
            const unitPriceTicket = this.calculateTicketPrice(passenger, ticketPrice, trainDetails);

            return total + unitPriceTicket;
        }, 0)
    }
}
