#!/bin/bash

# Stop the light test validator
light test-validator --stop

# Start the light test validator
light test-validator

# Wait for the validator to initialize (add a sleep command to ensure it's fully started)
sleep 3

# Run Solana airdrop command
solana airdrop 10 F3AgzvzPFH56VPzMKfQFt8rddNe5RUrrrWMSGjfM1sFQ

