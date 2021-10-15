import pytest

from girder.plugin import loadedPlugins


@pytest.mark.plugin('ninjato_api')
def test_import(server):
    assert 'ninjato_api' in loadedPlugins()
