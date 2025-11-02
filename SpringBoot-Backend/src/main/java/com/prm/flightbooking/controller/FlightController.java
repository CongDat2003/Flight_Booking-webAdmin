package com.prm.flightbooking.controller;

import com.prm.flightbooking.dto.FlightResponse;
import com.prm.flightbooking.dto.FlightSearchRequest;
import com.prm.flightbooking.entity.Flight;
import com.prm.flightbooking.service.FlightService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/flights")
@CrossOrigin(origins = "*")
public class FlightController {
    
    @Autowired
    private FlightService flightService;
    
    @GetMapping
    public ResponseEntity<List<FlightResponse>> getAllFlights() {
        List<Flight> flights = flightService.findAll();
        List<FlightResponse> flightResponses = flights.stream()
                .map(this::convertToFlightResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(flightResponses);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<FlightResponse> getFlightById(@PathVariable Long id) {
        return flightService.findById(id)
                .map(flight -> ResponseEntity.ok(convertToFlightResponse(flight)))
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping("/search")
    public ResponseEntity<List<FlightResponse>> searchFlights(@RequestBody FlightSearchRequest searchRequest) {
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
            LocalDateTime departureDate = LocalDateTime.parse(searchRequest.getDepartureDate(), formatter);
            
            List<Flight> flights = flightService.searchFlights(
                    searchRequest.getDepartureAirportId(),
                    searchRequest.getArrivalAirportId(),
                    departureDate
            );
            
            List<FlightResponse> flightResponses = flights.stream()
                    .map(this::convertToFlightResponse)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(flightResponses);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/available")
    public ResponseEntity<List<FlightResponse>> getAvailableFlights() {
        List<Flight> flights = flightService.findAvailableFlights();
        List<FlightResponse> flightResponses = flights.stream()
                .map(this::convertToFlightResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(flightResponses);
    }
    
    private FlightResponse convertToFlightResponse(Flight flight) {
        FlightResponse response = new FlightResponse();
        response.setId(flight.getId());
        response.setFlightNumber(flight.getFlightNumber());
        response.setAirlineName(flight.getAirline().getName());
        response.setAirlineCode(flight.getAirline().getCode());
        response.setDepartureAirportName(flight.getDepartureAirport().getName());
        response.setDepartureAirportCode(flight.getDepartureAirport().getCode());
        response.setArrivalAirportName(flight.getArrivalAirport().getName());
        response.setArrivalAirportCode(flight.getArrivalAirport().getCode());
        response.setDepartureTime(flight.getDepartureTime());
        response.setArrivalTime(flight.getArrivalTime());
        response.setBasePrice(flight.getBasePrice());
        response.setTotalSeats(flight.getTotalSeats());
        response.setAvailableSeats(flight.getAvailableSeats());
        response.setStatus(flight.getStatus().name());
        response.setAircraftType(flight.getAircraftType().getName());
        return response;
    }
}
