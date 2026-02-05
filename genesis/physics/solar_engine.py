"""
PROJECT SOLAR: GENESIS OMEGA - Physics Engine
NREL PySAM Integration for Ground Truth Solar Calculations
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import numpy as np
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

@dataclass
class SolarSystemConfig:
    """Solar system configuration parameters"""
    system_capacity: float  # kW DC
    module_type: int       # 0=Standard, 1=Premium, 2=Thin film
    array_type: int        # 0=Fixed, 1=1-axis, 2=2-axis, 3=Azimuth axis, 4=Seasonal tilt
    tilt: float           # degrees
    azimuth: float        # degrees (180 = due south)
    ground_coverage_ratio: float
    dc_ac_ratio: float
    inv_eff: float        # inverter efficiency %
    losses: float         # system losses %
    
@dataclass 
class WeatherData:
    """Weather data for solar calculations"""
    lat: float
    lon: float
    tz: float
    elev: float
    year: int
    month: List[int]
    hour: List[int]
    dn: List[float]      # Direct normal irradiance
    df: List[float]      # Diffuse horizontal irradiance  
    gh: List[float]      # Global horizontal irradiance
    wspd: List[float]    # Wind speed
    tdry: List[float]    # Dry bulb temperature
    
@dataclass
class SolarResults:
    """Results from PySAM solar simulation"""
    annual_energy: float        # kWh/year
    monthly_energy: List[float] # kWh/month
    capacity_factor: float      # %
    lcoe_real: float           # $/kWh
    npv: float                 # $ net present value
    payback_period: float      # years
    irr: float                 # % internal rate of return
    ac_monthly: List[float]    # AC energy monthly
    poa_monthly: List[float]   # Plane of array irradiance monthly
    success: bool
    messages: List[str]

class PhysicsEngine:
    """
    Ground truth physics engine using NREL PySAM
    Prevents hallucination by providing real solar calculations
    """
    
    def __init__(self):
        self.pysam_available = False
        self.fallback_mode = True
        self._initialize_pysam()
        
    def _initialize_pysam(self):
        """Initialize PySAM library"""
        try:
            import PySAM.Pvsamv1 as pv
            import PySAM.Grid as grid
            import PySAM.Utilityrate5 as ur
            import PySAM.Cashloan as cl
            
            self.pv = pv
            self.grid = grid 
            self.ur = ur
            self.cl = cl
            self.pysam_available = True
            self.fallback_mode = False
            
            logger.info("PySAM successfully initialized - Ground truth physics enabled")
            
        except ImportError:
            logger.warning("PySAM not available - Using fallback physics models")
            self.fallback_mode = True
            
    async def run_solar_simulation(self, 
                                   config: SolarSystemConfig, 
                                   weather: Optional[WeatherData] = None,
                                   financial_params: Optional[Dict] = None) -> SolarResults:
        """
        Run complete solar system simulation using PySAM
        """
        if self.fallback_mode:
            return await self._fallback_simulation(config, weather, financial_params)
            
        try:
            # Create PySAM model instances
            system_model = self.pv.new()
            grid_model = self.grid.new()
            
            # Configure solar resource (weather data)
            if weather:
                self._configure_weather_data(system_model, weather)
            else:
                # Use default weather data for simulation location
                self._configure_default_weather(system_model, lat=35.0, lon=-119.0)
            
            # Configure system design
            self._configure_system_design(system_model, config)
            
            # Configure losses and performance
            self._configure_system_losses(system_model, config)
            
            # Execute simulation
            system_model.execute()
            
            # Extract results
            results = self._extract_simulation_results(system_model, config)
            
            # Add financial analysis if parameters provided
            if financial_params:
                results = await self._add_financial_analysis(results, financial_params, system_model)
            
            logger.info(f"PySAM simulation completed: {results.annual_energy:.1f} kWh/year, CF: {results.capacity_factor:.1f}%")
            return results
            
        except Exception as e:
            logger.error(f"PySAM simulation error: {e}")
            # Fall back to simplified model
            return await self._fallback_simulation(config, weather, financial_params)
            
    def _configure_weather_data(self, model, weather: WeatherData):
        """Configure weather data in PySAM model"""
        # Set location
        model.SolarResource.solar_resource_data = {
            'lat': weather.lat,
            'lon': weather.lon, 
            'tz': weather.tz,
            'elev': weather.elev,
            'year': [weather.year] * 8760,
            'month': weather.month,
            'hour': weather.hour,
            'dn': weather.dn,
            'df': weather.df,
            'gh': weather.gh,
            'wspd': weather.wspd,
            'tdry': weather.tdry
        }
        
    def _configure_default_weather(self, model, lat: float, lon: float):
        """Configure default weather data for location"""
        # This would use NREL NSRDB data in production
        # For now, use PySAM defaults
        model.SolarResource.solar_resource_file = ""  # Use built-in weather
        
    def _configure_system_design(self, model, config: SolarSystemConfig):
        """Configure PV system design parameters"""
        
        # System capacity
        model.SystemDesign.system_capacity = config.system_capacity
        
        # Module and array configuration  
        model.SystemDesign.module_type = config.module_type
        model.SystemDesign.array_type = config.array_type
        model.SystemDesign.tilt = config.tilt
        model.SystemDesign.azimuth = config.azimuth
        model.SystemDesign.ground_coverage_ratio = config.ground_coverage_ratio
        
        # Inverter configuration
        model.SystemDesign.dc_ac_ratio = config.dc_ac_ratio
        model.SystemDesign.inv_eff = config.inv_eff
        
    def _configure_system_losses(self, model, config: SolarSystemConfig):
        """Configure system losses"""
        model.SystemDesign.losses = config.losses
        
        # Detailed loss breakdown
        model.Losses.soiling = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]  # Monthly soiling losses
        model.Losses.shading_soiling = [0] * 12
        model.Losses.snow = [0] * 12  # Snow losses by month
        model.Losses.mismatch = 2.0
        model.Losses.diodes_connections = 0.5
        model.Losses.dcwiring = 2.0
        model.Losses.acwiring = 1.0
        model.Losses.transformer_no_load_loss = 0.0
        model.Losses.transformer_load_loss = 0.0
        
    def _extract_simulation_results(self, model, config: SolarSystemConfig) -> SolarResults:
        """Extract results from completed PySAM simulation"""
        
        # Get annual energy output
        annual_energy = model.Outputs.annual_energy
        
        # Get monthly energy
        monthly_ac = model.Outputs.ac_monthly
        
        # Get capacity factor
        capacity_factor = model.Outputs.capacity_factor
        
        # Get plane of array irradiance
        poa_monthly = model.Outputs.poa_monthly if hasattr(model.Outputs, 'poa_monthly') else [0] * 12
        
        return SolarResults(
            annual_energy=annual_energy,
            monthly_energy=monthly_ac.tolist() if hasattr(monthly_ac, 'tolist') else list(monthly_ac),
            capacity_factor=capacity_factor,
            lcoe_real=0.0,  # Will be calculated in financial analysis
            npv=0.0,
            payback_period=0.0,
            irr=0.0,
            ac_monthly=monthly_ac.tolist() if hasattr(monthly_ac, 'tolist') else list(monthly_ac),
            poa_monthly=poa_monthly.tolist() if hasattr(poa_monthly, 'tolist') else list(poa_monthly),
            success=True,
            messages=["PySAM simulation completed successfully"]
        )
        
    async def _add_financial_analysis(self, results: SolarResults, financial_params: Dict, model) -> SolarResults:
        """Add financial analysis using PySAM financial models"""
        try:
            # Create financial model
            cashflow = self.cl.new()
            
            # Configure financial parameters
            cashflow.FinancialParameters.analysis_period = financial_params.get('analysis_period', 25)
            cashflow.FinancialParameters.debt_fraction = financial_params.get('debt_fraction', 60.0)
            cashflow.FinancialParameters.federal_tax_rate = financial_params.get('federal_tax_rate', [21] * 25)
            cashflow.FinancialParameters.state_tax_rate = financial_params.get('state_tax_rate', [0] * 25)
            cashflow.FinancialParameters.real_discount_rate = financial_params.get('real_discount_rate', 6.4)
            cashflow.FinancialParameters.inflation_rate = financial_params.get('inflation_rate', 2.5)
            
            # System costs
            cashflow.SystemCosts.total_installed_cost = financial_params.get('installed_cost_per_watt', 2.5) * results.annual_energy / 1200 * 1000  # Rough estimate
            
            # System output (link to PV model)
            cashflow.SystemOutput.gen = model.Outputs.gen
            
            # Execute financial analysis
            cashflow.execute()
            
            # Extract financial results
            results.lcoe_real = cashflow.Outputs.lcoe_real
            results.npv = cashflow.Outputs.npv
            results.payback_period = cashflow.Outputs.payback
            results.irr = cashflow.Outputs.irr
            
            results.messages.append("Financial analysis completed")
            
        except Exception as e:
            logger.error(f"Financial analysis error: {e}")
            results.messages.append(f"Financial analysis failed: {e}")
            
        return results
        
    async def _fallback_simulation(self, 
                                   config: SolarSystemConfig,
                                   weather: Optional[WeatherData] = None,
                                   financial_params: Optional[Dict] = None) -> SolarResults:
        """
        Fallback simulation using simplified models when PySAM unavailable
        """
        logger.warning("Using fallback physics simulation - results are estimates only")
        
        # Simplified solar calculation
        # Base irradiance assumption (kWh/m²/year)
        annual_irradiance = 1800.0  # Typical for good solar location
        
        if weather and weather.gh:
            # Use actual irradiance data if available
            annual_irradiance = sum(weather.gh) / 1000.0  # Convert W/m² to kWh/m²
            
        # System performance calculation
        system_efficiency = 0.15  # Typical panel efficiency
        if config.module_type == 1:  # Premium modules
            system_efficiency = 0.20
        elif config.module_type == 2:  # Thin film
            system_efficiency = 0.12
            
        # Calculate energy output
        panel_area = config.system_capacity / (system_efficiency * 1000)  # m²
        gross_energy = annual_irradiance * panel_area * system_efficiency
        
        # Apply losses
        net_energy = gross_energy * (1 - config.losses / 100) * (config.inv_eff / 100)
        
        # Capacity factor
        capacity_factor = (net_energy / (config.system_capacity * 8760)) * 100
        
        # Monthly distribution (simplified seasonal pattern)
        monthly_factors = [0.8, 0.9, 1.1, 1.2, 1.3, 1.3, 1.3, 1.2, 1.1, 0.9, 0.8, 0.7]
        monthly_energy = [(net_energy / 12) * factor for factor in monthly_factors]
        
        # Simple financial estimates
        lcoe = 0.06  # $/kWh typical LCOE
        payback = 8.0  # years typical payback
        
        if financial_params:
            installed_cost = financial_params.get('installed_cost_per_watt', 2.5) * config.system_capacity * 1000
            annual_savings = net_energy * financial_params.get('electricity_rate', 0.12)
            if annual_savings > 0:
                payback = installed_cost / annual_savings
                
        return SolarResults(
            annual_energy=net_energy,
            monthly_energy=monthly_energy,
            capacity_factor=capacity_factor,
            lcoe_real=lcoe,
            npv=0.0,
            payback_period=payback,
            irr=12.0,  # Typical IRR
            ac_monthly=monthly_energy,
            poa_monthly=[annual_irradiance / 12] * 12,
            success=True,
            messages=["Fallback physics simulation - estimates only (PySAM recommended for accuracy)"]
        )
        
    async def validate_system_design(self, config: SolarSystemConfig) -> Dict[str, Any]:
        """
        Validate system design parameters against physical constraints
        """
        validation_results = {
            'valid': True,
            'warnings': [],
            'errors': []
        }
        
        # Capacity validation
        if config.system_capacity <= 0:
            validation_results['errors'].append("System capacity must be positive")
            validation_results['valid'] = False
            
        if config.system_capacity > 10000:  # 10 MW limit for this model
            validation_results['warnings'].append("Large system size - consider utility-scale model")
            
        # Tilt validation
        if config.tilt < 0 or config.tilt > 90:
            validation_results['errors'].append("Tilt must be between 0 and 90 degrees")
            validation_results['valid'] = False
            
        # Azimuth validation
        if config.azimuth < 0 or config.azimuth >= 360:
            validation_results['errors'].append("Azimuth must be between 0 and 360 degrees")
            validation_results['valid'] = False
            
        # Efficiency validation
        if config.inv_eff <= 0 or config.inv_eff > 100:
            validation_results['errors'].append("Inverter efficiency must be between 0 and 100%")
            validation_results['valid'] = False
            
        # DC/AC ratio validation
        if config.dc_ac_ratio < 1.0:
            validation_results['warnings'].append("DC/AC ratio below 1.0 may indicate undersized DC array")
        elif config.dc_ac_ratio > 2.0:
            validation_results['warnings'].append("High DC/AC ratio may cause clipping losses")
            
        return validation_results
        
    async def run_sensitivity_analysis(self, 
                                       base_config: SolarSystemConfig,
                                       parameter_ranges: Dict[str, Tuple[float, float]]) -> Dict[str, Any]:
        """
        Run sensitivity analysis varying key parameters
        """
        sensitivity_results = {
            'base_case': await self.run_solar_simulation(base_config),
            'sensitivities': {}
        }
        
        for param, (min_val, max_val) in parameter_ranges.items():
            param_results = []
            
            # Test parameter range
            test_values = np.linspace(min_val, max_val, 5)
            
            for test_val in test_values:
                test_config = SolarSystemConfig(**base_config.__dict__)
                setattr(test_config, param, test_val)
                
                try:
                    result = await self.run_solar_simulation(test_config)
                    param_results.append({
                        'parameter_value': test_val,
                        'annual_energy': result.annual_energy,
                        'capacity_factor': result.capacity_factor,
                        'lcoe': result.lcoe_real
                    })
                except Exception as e:
                    logger.error(f"Sensitivity analysis error for {param}={test_val}: {e}")
                    
            sensitivity_results['sensitivities'][param] = param_results
            
        return sensitivity_results

# Global physics engine instance
physics_engine = PhysicsEngine()

async def get_physics_engine() -> PhysicsEngine:
    """Get the global physics engine instance"""
    return physics_engine