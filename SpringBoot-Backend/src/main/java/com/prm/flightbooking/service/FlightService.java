package com.prm.flightbooking.service;

import com.prm.flightbooking.entity.Flight;
import com.prm.flightbooking.entity.Flight.FlightStatus;
import com.prm.flightbooking.repository.FlightRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class FlightService {
    
    @Autowired
    private FlightRepository flightRepository;
    
    public List<Flight> findAll() {
        return flightRepository.findAll();
    }
    
    public Optional<Flight> findById(Long id) {
        return flightRepository.findById(id);
    }
    
    public Flight createFlight(Flight flight) {
        return flightRepository.save(flight);
    }
    
    public Flight updateFlight(Flight flight) {
        return flightRepository.save(flight);
    }
    
    public void deleteFlight(Long id) {
        flightRepository.deleteById(id);
    }
    
    public List<Flight> findByStatus(FlightStatus status) {
        return flightRepository.findByStatus(status);
    }
    
    public List<Flight> searchFlights(Long departureAirportId, Long arrivalAirportId, LocalDateTime departureDate) {
        return flightRepository.findFlightsByRouteAndDate(departureAirportId, arrivalAirportId, departureDate);
    }
    
    public List<Flight> searchFlightsByDateRange(Long departureAirportId, Long arrivalAirportId, 
                                                LocalDateTime startDate, LocalDateTime endDate) {
        return flightRepository.findFlightsByRouteAndDateRange(departureAirportId, arrivalAirportId, startDate, endDate);
    }
    
    public List<Flight> findByAirline(Long airlineId) {
        return flightRepository.findByAirlineId(airlineId);
    }
    
    public List<Flight> findByAircraftType(Long aircraftTypeId) {
        return flightRepository.findByAircraftTypeId(aircraftTypeId);
    }
    
    public List<Flight> findAvailableFlights() {
        return flightRepository.findAvailableFlights();
    }
    
    public Flight updateFlightStatus(Long flightId, FlightStatus status) {
        Flight flight = flightRepository.findById(flightId)
                .orElseThrow(() -> new RuntimeException("Flight not found"));
        flight.setStatus(status);
        return flightRepository.save(flight);
    }
    
    public Flight updateAvailableSeats(Long flightId, Integer seatsBooked) {
        Flight flight = flightRepository.findById(flightId)
                .orElseThrow(() -> new RuntimeException("Flight not found"));
        flight.setAvailableSeats(flight.getAvailableSeats() - seatsBooked);
        return flightRepository.save(flight);
    }
    
    public List<Flight> findOverdueFlights() {
        return flightRepository.findOverdueFlights(LocalDateTime.now());
    }
}
