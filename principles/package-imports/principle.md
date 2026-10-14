# Always Use Package Imports

Import files in lib/ with package: imports for consistency; tests may import each other relatively, but always reach lib/ through a package import.

For consistency, always use package imports in lib/. Exception: relative imports in test/ are allowed, but always reference files from lib/ with a package import.
