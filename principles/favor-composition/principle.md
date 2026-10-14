# Favor Composition Over Inheritance

Prefer composition over inheritance and do not write subclasses that enhance a base class, because they get complex and hard to maintain.

Unless the framework requires it, avoid inheritance.  
Interfaces are fine, but never create subclasses that "enhance" a base class.  
This always leads to complex and hard-to-maintain code.
