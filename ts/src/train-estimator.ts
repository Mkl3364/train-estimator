import { ApiException, DiscountCard, InvalidTripInputException, Passenger, TripDetails, TripRequest } from "./model/trip.request";

export class TrainTicketEstimator {

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

        let tot = this.calculateTotalPrice(passengers, ticketPrice, trainDetails);

        if (passengers.length == 2) {
            let couple = false;
            let minor = false;
            for (let i = 0; i < passengers.length; i++) {
                if (passengers[i].discounts.includes(DiscountCard.Couple)) {
                    couple = true;
                }
                if (passengers[i].age < 18) {
                    minor = true;
                }
            }
            if (couple && !minor) {
                tot -= ticketPrice * 0.2 * 2;
            }
        }

        if (passengers.length == 1) {
            let cp = false;
            let mn = false;
            for (let i = 0; i < passengers.length; i++) {
                if (passengers[i].discounts.includes(DiscountCard.HalfCouple)) {
                    cp = true;
                }
                if (passengers[i].age < 18) {
                    mn = true;
                }
            }
            if (cp && !mn) {
                tot -= ticketPrice * 0.1;
            }
        }

        return tot;
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
        let tmp = ticketPrice;
    
        if (passenger.age < 0) {
            throw new InvalidTripInputException("Age is invalid");
        }
    
        if (passenger.age < 1) {
            return 0;
        }
    
        // Seniors
        if (passenger.age <= 17) {
            tmp = ticketPrice * 0.6;
        } else if (passenger.age >= 70) {
            tmp = ticketPrice * 0.8;
            if (passenger.discounts.includes(DiscountCard.Senior)) {
                tmp -= ticketPrice * 0.2;
            }
        } else {
            tmp = ticketPrice * 1.2;
        }
    
        const currentDate = new Date();
        if (trainDetails.details.when.getTime() >= currentDate.setDate(currentDate.getDate() + 30)) {
            tmp -= ticketPrice * 0.2;
        } else if (trainDetails.details.when.getTime() > currentDate.setDate(currentDate.getDate() - 30 + 5)) {
            const date1 = trainDetails.details.when;
            const date2 = new Date();
            const diff = Math.abs(date1.getTime() - date2.getTime());
            const diffDays = Math.ceil(diff / (1000 * 3600 * 24));
    
            tmp += (20 - diffDays) * 0.02 * ticketPrice;
        } else {
            tmp += ticketPrice;
        }
    
        if (passenger.age > 0 && passenger.age < 4) {
            return 9;
        }
    
        if (passenger.discounts.includes(DiscountCard.TrainStroke)) {
            return 1;
        }
    
        return tmp;
    }

    calculateTotalPrice(passengers: Passenger[], ticketPrice: number, trainDetails: TripRequest) {
        let total = 0;
        for (let i = 0; i < passengers.length; i++) {
            const tmp = this.calculateTicketPrice(passengers[i], ticketPrice, trainDetails);
            total += tmp;
        }
        return total;
    }
}