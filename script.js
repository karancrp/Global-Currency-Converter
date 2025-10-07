
        // --- Global Variables and Setup ---
        // Using a public endpoint that doesn't require a personal API key for demo purposes.
        const API_URL = 'https://api.exchangerate-api.com/v4/latest/'; 
        
        // DOM Elements
        const loadingIndicator = document.getElementById('loading-indicator');
        const converterForm = document.getElementById('converter-form');
        const errorMessage = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');
        const amountInput = document.getElementById('amount-input');
        const sourceCurrencySelect = document.getElementById('source-currency');
        const targetCurrencySelect = document.getElementById('target-currency');
        const swapBtn = document.getElementById('swap-btn');
        const convertBtn = document.getElementById('convert-btn');
        const resultDisplay = document.getElementById('result-display');
        const resultAmountEl = document.getElementById('result-amount');
        const exchangeRateEl = document.getElementById('exchange-rate');

        // State
        let availableCurrencies = {}; // Stores all available currency codes
        let currentRates = {}; // Stores rates relative to the currently selected source currency

        // --- Utility Functions ---

        /**
         * Formats a number as currency based on the currency code.
         * @param {number} amount - The amount to format.
         * @param {string} currencyCode - The currency code (e.g., 'USD').
         * @returns {string} Formatted currency string.
         */
        const formatCurrency = (amount, currencyCode) => {
            try {
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currencyCode,
                    minimumFractionDigits: 2,
                    maximumFractionDigits: amount > 1000 ? 2 : 4 
                }).format(amount);
            } catch (e) {
                // Fallback if the currency code is invalid for Intl.NumberFormat
                return `${currencyCode} ${amount.toFixed(4)}`;
            }
        };

        /**
         * Displays an error message and hides loading/results.
         * @param {string} message - The error message to display.
         */
        function showError(message) {
            loadingIndicator.classList.add('hidden');
            resultDisplay.classList.add('hidden');
            converterForm.classList.remove('hidden'); // Keep form visible to retry
            errorMessage.classList.remove('hidden');
            errorText.textContent = message;
        }

        /**
         * Toggles the visibility of the loading indicator.
         * @param {boolean} show - True to show, false to hide.
         */
        function showLoading(show) {
            loadingIndicator.classList.toggle('hidden', !show);
            converterForm.classList.toggle('hidden', show);
            errorMessage.classList.add('hidden');
            convertBtn.disabled = show;
        }
        
        // --- Core Application Logic ---

        /**
         * Fetches a full list of currency codes and populates the dropdowns.
         */
        async function fetchCurrencyCodes() {
            showLoading(true);
            try {
                // We fetch the rates for USD first, as the keys are the list of available currencies
                const response = await fetch(`${API_URL}USD`); 
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                if (data.rates) {
                    availableCurrencies = data.rates;
                    populateDropdowns(Object.keys(availableCurrencies));
                } else {
                    throw new Error("Invalid API response structure.");
                }
            } catch (error) {
                showError(`Failed to load currency codes: ${error.message}`);
            } finally {
                showLoading(false);
            }
        }

        /**
         * Populates both source and target currency dropdowns.
         * @param {Array} codes - Array of currency codes (e.g., ['USD', 'EUR']).
         */
        function populateDropdowns(codes) {
            sourceCurrencySelect.innerHTML = '';
            targetCurrencySelect.innerHTML = '';

            codes.sort().forEach(code => {
                const optionSource = new Option(code, code);
                const optionTarget = new Option(code, code);
                sourceCurrencySelect.appendChild(optionSource);
                targetCurrencySelect.appendChild(optionTarget);
            });
            
            // Set initial defaults
            sourceCurrencySelect.value = 'USD';
            targetCurrencySelect.value = 'INR';
            
            // Re-enable button after setup
            convertBtn.disabled = false;
        }
        
        /**
         * Fetches the exchange rates based on the currently selected source currency.
         * @param {string} baseCode - The source currency code.
         */
        async function fetchRates(baseCode) {
            showLoading(true);
            try {
                const response = await fetch(`${API_URL}${baseCode}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                if (data.rates) {
                    currentRates = data.rates;
                    convertBtn.disabled = false;
                    // Automatically run conversion after fetching new rates
                    performConversion(); 
                } else {
                    throw new Error("Failed to retrieve exchange rates.");
                }

            } catch (error) {
                showError(`Failed to fetch rates for ${baseCode}: ${error.message}`);
            } finally {
                showLoading(false);
            }
        }

        /**
         * Performs the currency conversion calculation and updates the display.
         */
        function performConversion() {
            errorMessage.classList.add('hidden');

            const amount = parseFloat(amountInput.value);
            const sourceCode = sourceCurrencySelect.value;
            const targetCode = targetCurrencySelect.value;

            if (isNaN(amount) || amount <= 0) {
                showError("Please enter a valid amount greater than zero.");
                return;
            }

            if (sourceCode === targetCode) {
                // Trivial case: converting to itself
                const result = formatCurrency(amount, targetCode);
                resultAmountEl.textContent = result;
                exchangeRateEl.textContent = `1 ${sourceCode} = 1.0000 ${targetCode}`;
                resultDisplay.classList.remove('hidden');
                return;
            }

            const rate = currentRates[targetCode];

            if (rate === undefined) {
                showError(`Exchange rate for ${targetCode} not available when using ${sourceCode} as base.`);
                resultDisplay.classList.add('hidden');
                return;
            }

            const convertedAmount = amount * rate;
            
            // Update the display
            resultAmountEl.textContent = formatCurrency(convertedAmount, targetCode);
            exchangeRateEl.textContent = `1 ${sourceCode} = ${rate.toFixed(4)} ${targetCode}`;
            resultDisplay.classList.remove('hidden');
        }

        /**
         * Swaps the source and target currency selections.
         */
        function swapCurrencies() {
            const temp = sourceCurrencySelect.value;
            sourceCurrencySelect.value = targetCurrencySelect.value;
            targetCurrencySelect.value = temp;

            // Since the base currency has changed, we must fetch new rates and then convert
            fetchRates(sourceCurrencySelect.value);
        }

        // --- Event Listeners and Initialization ---

        document.addEventListener('DOMContentLoaded', () => {
            // 1. Initial fetch to get all supported currency codes
            fetchCurrencyCodes();

            // Event listener for the main conversion button
            convertBtn.addEventListener('click', () => {
                // If the source currency has changed, fetch new rates first, 
                // otherwise just perform the conversion using existing rates.
                const newSourceCode = sourceCurrencySelect.value;
                if (newSourceCode !== Object.keys(currentRates)[0]) {
                    fetchRates(newSourceCode);
                } else {
                    performConversion();
                }
            });
            
            // Event listener for the swap button
            swapBtn.addEventListener('click', swapCurrencies);

            // Optional: Auto-fetch new rates when base currency is changed in dropdown
            sourceCurrencySelect.addEventListener('change', () => {
                // Only fetch rates if the base is actually different
                const newSourceCode = sourceCurrencySelect.value;
                if (newSourceCode !== Object.keys(currentRates)[0]) {
                    fetchRates(newSourceCode);
                }
            });
        });
    