# tests/run_tests.py
#!/usr/bin/env python
import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_tests():
    """Run all tests with coverage report"""
    args = [
        'tests/',
        '-v',
        '--tb=short',
        '--maxfail=3',
        '-p', 'no:warnings'  # Disable warnings to keep output clean
    ]
    
    # Add coverage if pytest-cov is installed
    try:
        import pytest_cov
        args.extend(['--cov=app', '--cov-report=term-missing'])
    except ImportError:
        print("Note: Install pytest-cov for coverage reports")
    
    # Run tests
    exit_code = pytest.main(args)
    return exit_code

def run_specific_test(test_name):
    """Run a specific test"""
    args = [
        f'tests/{test_name}',
        '-v',
        '--tb=short'
    ]
    
    exit_code = pytest.main(args)
    return exit_code

if __name__ == '__main__':
    print("\n" + "="*60)
    print("RUNNING LIBRARY MANAGEMENT SYSTEM TESTS")
    print("="*60 + "\n")
    
    if len(sys.argv) > 1:
        test_name = sys.argv[1]
        print(f"Running specific test: {test_name}")
        sys.exit(run_specific_test(test_name))
    else:
        print("Running all tests...")
        sys.exit(run_tests())