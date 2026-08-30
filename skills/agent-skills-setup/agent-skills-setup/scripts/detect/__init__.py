"""Detection probe framework.

Each registered probe inspects a product / profile on the local
device and reports an installation state.  Probes are kept small so
they can be composed per profile without requiring heavy native
dependencies.
"""