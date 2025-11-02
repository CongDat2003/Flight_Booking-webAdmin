package com.prm.flightbooking.repository;

import com.prm.flightbooking.entity.Airport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AirportRepository extends JpaRepository<Airport, Long> {
    
    Optional<Airport> findByCode(String code);
    
    List<Airport> findByCity(String city);
    
    List<Airport> findByCountry(String country);
    
    @Query("SELECT a FROM Airport a WHERE a.name LIKE %:searchTerm% OR a.code LIKE %:searchTerm% OR a.city LIKE %:searchTerm%")
    List<Airport> searchByNameCodeOrCity(@Param("searchTerm") String searchTerm);
    
    @Query("SELECT DISTINCT a.city FROM Airport a ORDER BY a.city")
    List<String> findAllCities();
    
    @Query("SELECT DISTINCT a.country FROM Airport a ORDER BY a.country")
    List<String> findAllCountries();
}
